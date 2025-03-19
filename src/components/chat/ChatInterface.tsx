import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, UserRound, Check, BookOpen, Zap, Settings2, Globe, SlidersHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { SystemPersona, OpenRouterModel, EnhancementType } from '@/types';
import { Slider } from "@/components/ui/slider";
import { fetchOpenRouterModels, enhancePrompt } from '@/services/openRouterService';
import { googleSearch, formatSearchResultsAsContext as formatGoogleSearchResults } from '@/services/googleSearchService';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import EnhancementTypeMenu from './EnhancementTypeMenu';
import WebSearchToggle from './WebSearchToggle';
import { Toggle } from '@/components/ui/toggle';

const ChatInterface: React.FC = () => {
  const {
    currentWorkspaceId,
    currentThreadId,
    currentThread,
    sendMessage,
    currentWorkspace,
    updateWorkspaceSettings,
    getKnowledgeContext
  } = useWorkspace();

  const { settings } = useGlobalSettings();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedPersona, setSelectedPersona] = useState<SystemPersona | null>(null);

  // State for model selection and temperature
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [temperature, setTemperature] = useState<number>(1.0);

  const [selectedEnhancementType, setSelectedEnhancementType] = useState<EnhancementType | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // State for available models
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [openModelDropdown, setOpenModelDropdown] = useState(false);

  // State for the web search toggle
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);

  // State for the unlabeled toggle
  const [isCustomToggleEnabled, setIsCustomToggleEnabled] = useState(false);

  // Ref for the textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Fetch available models from OpenRouter
  useEffect(() => {
    const fetchModels = async () => {
      if (settings.openRouterApiKey) {
        try {
          const models = await fetchOpenRouterModels(settings.openRouterApiKey);
          setAvailableModels(models);
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to fetch models from OpenRouter.',
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    };

    fetchModels();
  }, [settings.openRouterApiKey]);

  // Get the selected persona from workspace settings when component loads
  useEffect(() => {
    if (currentWorkspace?.settings?.selectedPersonaId) {
      const persona = settings.systemPersonas.find(
        p => p.id === currentWorkspace.settings.selectedPersonaId
      );
      if (persona) {
        setSelectedPersona(persona);
      }
    } else {
      setSelectedPersona(null);
    }
  }, [currentWorkspace?.settings?.selectedPersonaId, settings.systemPersonas]);

  // Update selectedModelId and temperature when currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setSelectedModelId(currentWorkspace.settings.selectedModelId);
      setTemperature(currentWorkspace.settings.temperature ?? 1.0);
    }
  }, [currentWorkspace]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);

  // Adjust textarea height when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`; // Add a small buffer
    }
  }, [input]);

  // Check if knowledge is enabled and included in the current workspace
  const hasKnowledgeInContext = currentWorkspaceId
    ? getKnowledgeContext(currentWorkspaceId).length > 0
    : false;

  const handleEnhancePrompt = async () => {
    if (!input.trim() || !settings.openRouterApiKey) return;

    setIsEnhancing(true);
    try {
      // Use ONLY the systemPromptModifications from the selected enhancement type.
      const systemPrompt = selectedEnhancementType?.systemPromptModifications || '';

      const enhancedText = await enhancePrompt(input, systemPrompt, settings.openRouterApiKey);
      setInput(enhancedText);
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to enhance prompt. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let systemPrompt = "You are a helpful assistant."; // Default

      if (currentWorkspace?.settings?.overrideSystemPrompt && currentWorkspace.settings.customSystemPrompt) {
        systemPrompt = currentWorkspace.settings.customSystemPrompt;
      } else {
        systemPrompt = settings.defaultSystemPrompt || systemPrompt;
      }

      if (selectedPersona) {
        systemPrompt = `${selectedPersona.promptAddition}\n\n${systemPrompt}`;
      }

      // Web search integration
      if (isWebSearchEnabled) {
        let searchResults;
        let formattedContext;

        // Use Google Programmable Search for both regular and deep search
        if (!settings.googleSearchApiKey || !settings.googleSearchId) {
          toast({
            title: 'Error',
            description: 'Google API Key and Search ID are required for web search.',
            variant: 'destructive',
            duration: 3000,
          });
          setIsLoading(false);
          return;
        }

        // Increased result count for deep search
        const resultCount = isDeepSearchEnabled ? 10 : 5;
        searchResults = await googleSearch(userMessage, settings.googleSearchApiKey, settings.googleSearchId, { count: resultCount });
        formattedContext = formatGoogleSearchResults(searchResults, userMessage);

        systemPrompt = `${systemPrompt}\n\n${formattedContext}`;
      }

      await sendMessage(userMessage, systemPrompt);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSelectPersona = (persona: SystemPersona | null) => {
    setSelectedPersona(persona);

    if (currentWorkspaceId) {
      updateWorkspaceSettings(currentWorkspaceId, {
        selectedPersonaId: persona?.id
      });

      toast({
        title: persona ? `${persona.name} Selected` : "Default Persona",
        description: persona
          ? `This persona will now influence your conversation.`
          : `Using default assistant behavior.`,
        duration: 2000,
      });
    }
  };

  const handleModelChange = (value: string) => {
    setSelectedModelId(value);
    if (currentWorkspaceId) {
      updateWorkspaceSettings(currentWorkspaceId, {
        selectedModelId: value,
      });
    }
    setOpenModelDropdown(false);
  };

  const handleTemperatureChange = (value: number[]) => {
    const newTemperature = value[0];
    setTemperature(newTemperature);
    if (currentWorkspaceId) {
      updateWorkspaceSettings(currentWorkspaceId, {
        temperature: newTemperature,
      });
    }
  };

    // Handle web search toggle
  const handleWebSearchToggle = () => {
    setIsWebSearchEnabled(prev => !prev);
    // Reset deep search when regular search is toggled
    if (isDeepSearchEnabled) {
      setIsDeepSearchEnabled(false);
    }
  };

  const handleDeepSearchToggle = () => {
    setIsDeepSearchEnabled(prev => !prev);
    // Ensure regular search is enabled when deep search is toggled
    if (!isWebSearchEnabled) {
      setIsWebSearchEnabled(true);
    }
  };

  const handleCustomToggleChange = () => {
    setIsCustomToggleEnabled(prev => !prev);
    // Placeholder for custom toggle functionality
  };


  // Get input background gradient based on selected persona
  const getInputBackgroundStyle = () => {
    if (selectedPersona) {
      if (selectedPersona.gradientFrom && selectedPersona.gradientTo) {
        return {
          background: `linear-gradient(to right, ${selectedPersona.gradientFrom}, ${selectedPersona.gradientTo})`,
          opacity: 0.1
        };
      } else {
        return {
          background: selectedPersona.iconColor,
          opacity: 0.1
        };
      }
    } else {
      // Default workspace color gradient (indigo to magenta)
      return {
        background: 'linear-gradient(to right, #9b87f5, #D946EF)',
        opacity: 0.1
      };
    }
  };

  // Get persona avatar for AI messages
  const getPersonaAvatar = () => {
    if (selectedPersona) {
      return (
        <AvatarFallback
          style={{
            background: selectedPersona.gradientFrom && selectedPersona.gradientTo
              ? `linear-gradient(to right, ${selectedPersona.gradientFrom}, ${selectedPersona.gradientTo})`
              : selectedPersona.iconColor
          }}
        >
          {selectedPersona.name?.substring(0, 2) || 'AI'}
        </AvatarFallback>
      );
    } else {
      return (
        <AvatarImage src="/assets/bot-avatar.png" alt="AI" />
      );
    }
  };

  // Safely get messages from the current thread
  const messages = currentThread?.messages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Controls Container */}
      <div className="flex items-center p-2 border-b space-x-4">
        {/* Unlabeled Toggle with Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={isCustomToggleEnabled}
                onPressedChange={handleCustomToggleChange}
                aria-label="Custom toggle"
                className="mr-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {/* Placeholder description - update when functionality is defined */}
              Toggle custom feature
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Model Selection Dropdown */}
        <CommandDialog open={openModelDropdown} onOpenChange={setOpenModelDropdown}>
          <CommandInput placeholder="Search for a model..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup heading="Models">
              {availableModels.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleModelChange(model.id)}
                >
                  {model.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
        <Button variant="outline" onClick={() => setOpenModelDropdown(true)} className="w-[280px]">
          {selectedModelId ? (
            availableModels.find((model) => model.id === selectedModelId)?.name
          ) : (
            "Select a model..."
          )}
        </Button>

        {/* Temperature Slider */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <span>Temperature: {temperature.toFixed(1)}</span>
                <Slider
                  defaultValue={[temperature]}
                  value={[temperature]}
                  onValueChange={handleTemperatureChange}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  className="w-32"
                  aria-label="Temperature"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Temperature: {temperature.toFixed(1)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Persona Selection Dropdown (Existing) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: selectedPersona
                    ? selectedPersona.gradientFrom && selectedPersona.gradientTo
                      ? `linear-gradient(to right, ${selectedPersona.gradientFrom}, ${selectedPersona.gradientTo})`
                      : selectedPersona.iconColor
                    : "linear-gradient(to right, #9b87f5, #D946EF)",
                }}
              >
                <UserRound className="h-3 w-3 text-white" />
              </div>
              <span className="sr-only">Select Persona</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Select Persona</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleSelectPersona(null)}
              className="flex items-center justify-between"
            >
              Default
              {!selectedPersona && <Check className="h-4 w-4" />}
            </DropdownMenuItem>

            {settings.systemPersonas
              .filter(persona => persona.visibleInChat !== false)
              .map(persona => (
                <DropdownMenuItem
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{
                        background:
                          persona.gradientFrom && persona.gradientTo
                            ? `linear-gradient(to right, ${persona.gradientFrom}, ${persona.gradientTo})`
                            : persona.iconColor,
                      }}
                    />
                    {persona.name}
                  </div>
                  {selectedPersona?.id === persona.id && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasKnowledgeInContext && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-mycelial-secondary text-xs ml-1">
                  <BookOpen className="h-3 w-3 mr-1" />
                  <span>RAG</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Knowledge items are being used to enhance responses
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium">Start a new conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to begin chatting with the AI assistant
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[80%] ${
                    message.role === "user"
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Avatar className="h-8 w-8">
                      {getPersonaAvatar()}
                    </Avatar>
                  ) : null}

                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-mycelial-messages-user-from to-mycelial-messages-user-to text-white"
                        : "bg-gradient-to-r from-indigo-950 to-purple-950 text-white"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="text-base font-bold" {...props} />,
                        h5: ({ node, ...props }) => <h5 className="text-sm font-bold" {...props} />,
                        h6: ({ node, ...props }) => <h6 className="text-xs font-bold" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                        em: ({ node, ...props }) => <em className="italic" {...props} />,
                        del: ({ node, ...props }) => <del className="line-through" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li {...props} />,
                        a: ({ node, ...props }) => (
                          <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        img: ({ node, ...props }) => (
                          <img className="max-w-full" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-gray-400 pl-4 italic" {...props} />
                        ),
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className ?? "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              language={match[1]}
                              style={vscDarkPlus}
                              customStyle={{ backgroundColor: "#1A1F2C" }}
                              codeTagProps={{
                                style: {
                                  color: "#d4d4d8",
                                },
                              }}
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-mycelial-card px-1.5 py-0.5 rounded-md text-gray-300" {...props}>
                              {children}
                            </code>
                          );
                        },
                        hr: ({ node, ...props }) => <hr className="my-4 border-t border-gray-300" {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={getInputBackgroundStyle()}
        />
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 max-w-3xl mx-auto relative z-10"
        >
          {/* Web Search Toggle Button */}
          <WebSearchToggle
            isWebSearchEnabled={isWebSearchEnabled}
            isDeepSearchEnabled={isDeepSearchEnabled}
            onToggleWebSearch={handleWebSearchToggle}
            onToggleDeepSearch={handleDeepSearchToggle}
          />

          <div className="flex-1 relative">
            {/* Dynamic Textarea */}
            <textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="resize-none w-full pr-12 bg-transparent backdrop-blur-sm text-sm text-white focus:outline-none focus:ring-0 border-0"
              disabled={isLoading}
            />

            {/* AI Enhance Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !input.trim() || !settings.openRouterApiKey}
                    className="absolute right-2 bottom-2 h-8 w-8"
                  >
                    {isEnhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <span className="sr-only">Enhance prompt</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enhance prompt</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Enhancement Type Menu Button */}
          <EnhancementTypeMenu
            onSelect={setSelectedEnhancementType}
            selectedEnhancementType={selectedEnhancementType}
          >
            <Button
              size="icon"
              className="ml-2"
            >
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">Enhancement settings</span>
            </Button>
          </EnhancementTypeMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="ml-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>

        {hasKnowledgeInContext && (
          <div className="flex items-center justify-center mt-2">
            <span className="text-xs text-mycelial-secondary flex items-center">
              <BookOpen className="h-3 w-3 mr-1" />
              Using Knowledge Items to enhance responses
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
