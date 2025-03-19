export interface GlobalSettings {
  openRouterApiKey: string;
  defaultSystemPrompt: string;
  geminiApiKey: string;
  googleSearchApiKey?: string; // Added Google Search API Key
  googleSearchId?: string;     // Added Google Search ID
  selectedEmbeddingModelId: string;
  selectedPromptEngineerModelId: string;
  systemPersonas: SystemPersona[];
  showSystemPrompt: boolean;
  enhancementTypes: EnhancementType[];
}

export interface WorkspaceSettings {
  selectedModelId?: string;
  temperature?: number;
  customSystemPrompt?: string;
  selectedPersonaId?: string | null;
  openRouterApiKey?: string; // Add OpenRouter API Key to workspace settings
}

export interface Workspace {
  id: string;
  name: string;
  settings: WorkspaceSettings;
  createdAt: Date;
}

export interface KnowledgeItem {
  id: string;
  name: string;
  type: 'file' | 'text' | 'link' | 'folder' | 'basin';
  content?: string;
  filePath?: string;
  fileType?: string;
  createdAt: Date;
  updatedAt: Date;
  folderId?: string | null;
  basinId?: string | null;
  embeddingId?: string | null; // Add embeddingId
  metadata?: any; // Placeholder for file metadata
}

export interface KnowledgeBasin {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  items: KnowledgeItem[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  workspaceId: string;
}

export interface SystemPersona {
  id: string;
  name: string;
  description: string;
  promptAddition: string;
  iconColor: string;
  gradientFrom?: string;
  gradientTo?: string;
  createdAt: Date;
  isSystem: boolean;
  visibleInChat: boolean;
}

export interface EnhancementType {
  id: string;
  name: string;
  systemPromptModifications: string;
  knowledgeContext?: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  prompts: Prompt[];
  createdAt: Date;
  updatedAt: Date;
  isSystem: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string;
  categoryId: string;
  tags: string[];
  variables: Variable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Variable {
  name: string;
  description: string;
  defaultValue: string;
  type: 'text' | 'number' | 'boolean';
}
