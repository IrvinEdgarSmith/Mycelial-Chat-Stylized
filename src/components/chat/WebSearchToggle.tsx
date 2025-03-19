import React from 'react';
import { Button } from '../ui/button';
import { Globe } from 'lucide-react';

interface WebSearchToggleProps {
  isWebSearchEnabled: boolean;
  isDeepSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onToggleDeepSearch: () => void;
}

const WebSearchToggle: React.FC<WebSearchToggleProps> = ({
  isWebSearchEnabled,
  isDeepSearchEnabled,
  onToggleWebSearch,
  onToggleDeepSearch,
}) => {
  const handleDoubleClick = () => {
    onToggleDeepSearch();
  };

  let buttonVariant = "default";
  let iconColor = "text-gray-400";
  let buttonClasses = "h-8 w-8 rounded-md border transition-colors duration-200 flex items-center justify-center";

  if (isDeepSearchEnabled) {
    buttonVariant = "secondary";
    iconColor = "text-white";
    buttonClasses += " bg-purple-500"; // Purple background for deep search
  } else if (isWebSearchEnabled) {
    buttonVariant = "outline";
    iconColor = "text-green-500";
    buttonClasses += " bg-green-500";
  } else {
    buttonClasses += " bg-transparent";
  }

  return (
    <Button
      type="button"
      variant={buttonVariant as any}
      className={buttonClasses}
      onClick={onToggleWebSearch}
      onDoubleClick={handleDoubleClick}
    >
      <Globe className={`h-4 w-4 ${iconColor}`} />
      <span className="sr-only">
        {isDeepSearchEnabled ? "Disable Deep Web Search" : isWebSearchEnabled ? "Disable Web Search" : "Enable Web Search"}
      </span>
    </Button>
  );
};

export default WebSearchToggle;
