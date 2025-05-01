import { FC, useEffect, useState } from "react";
import { ModelOptions } from "@/types/llm";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";

// Model size labels
const getModelSizeLabel = (modelId: string): string => {
  const lowerId = modelId.toLowerCase();
  if (lowerId.includes("0.5b") || lowerId.includes("0.5-b")) {
    return "Tiny - 0.5B";
  } else if (lowerId.includes("1.1b") || lowerId.includes("1.1-b")) {
    return "Mini - 1.1B";
  } else if (lowerId.includes("2b") || lowerId.includes("2-b") || lowerId.includes("phi-2")) {
    return "Small - 2-3B";
  } else if (lowerId.includes("7b") || lowerId.includes("7-b")) {
    return "Medium - 7B";
  } else if (lowerId.includes("13b") || lowerId.includes("13-b")) {
    return "Large - 13B";
  } else {
    return "Unknown size";
  }
};

// Model description mapping
const getModelDescription = (modelId: string): string => {
  const lowerId = modelId.toLowerCase();
  if (lowerId.includes("qwen")) {
    return "Alibaba's efficient model optimized for mobile & web";
  } else if (lowerId.includes("tinyllama")) {
    return "A tiny but capable model, ideal for mobile & web use";
  } else if (lowerId.includes("phi")) {
    return "Microsoft's parameter-efficient model optimized for reasoning";
  } else if (lowerId.includes("llama")) {
    return "Meta's Llama model fine-tuned for chat and instruction following";
  } else if (lowerId.includes("vicuna")) {
    return "A fine-tuned LLaMA model with improved instruction-following abilities";
  } else if (lowerId.includes("mistral")) {
    return "High-quality open source model with excellent performance";
  } else {
    return "WebLLM-compatible language model";
  }
};

// Format model ID to a readable name
const formatModelName = (modelId: string): string => {
  // Extract base name
  let baseName = modelId;
  
  // Handle special cases
  if (modelId.includes("Qwen")) {
    return `Qwen ${modelId.includes("1.5") ? "1.5" : ""}`;
  } else if (modelId.includes("TinyLlama")) {
    return "TinyLlama";
  } else if (modelId.includes("Phi-2")) {
    return "Phi-2";
  } else if (modelId.includes("Llama")) {
    return "Llama 2";
  } else if (modelId.includes("vicuna")) {
    return "Vicuna";
  } else if (modelId.includes("mistral")) {
    return "Mistral";
  }
  
  // For other models, clean up the ID
  return baseName
    .replace(/-/g, ' ')
    .replace(/Chat/g, '')
    .replace(/chat/g, '')
    .trim();
};

interface ModelSelectorProps {
  currentModel: string;
  isLoading: boolean;
  onModelChange: (model: ModelOptions) => void;
}

export const ModelSelector: FC<ModelSelectorProps> = ({
  currentModel,
  isLoading,
  onModelChange
}) => {
  const [models, setModels] = useState<{id: string, name: string, description: string}[]>([]);
  
  // Get available models from WebLLM
  useEffect(() => {
    try {
      if (prebuiltAppConfig && prebuiltAppConfig.model_list) {
        console.log("Loading models from WebLLM config");
        
        const webllmModels = prebuiltAppConfig.model_list.map((model: {model_id: string; model: string}) => ({
          id: model.model_id,
          name: `${formatModelName(model.model_id)} (${getModelSizeLabel(model.model_id)})`,
          description: getModelDescription(model.model_id)
        }));
        
        console.log("Available WebLLM models:", webllmModels);
        
        // Filter to prefer smaller models for mobile/web
        const smallModels = webllmModels.filter(model => 
          model.id.includes("0.5B") || 
          model.id.includes("1.1B") || 
          model.id.includes("Phi-2")
        );
        
        // If we found small models, prioritize them
        if (smallModels.length > 0) {
          setModels(smallModels);
        } else {
          // Otherwise use all available models
          setModels(webllmModels);
        }
      } else {
        // Fallback to default models if WebLLM config not available
        console.log("WebLLM config not available, using defaults");
        setModels([
          {
            id: "Qwen1.5-0.5B-Chat",
            name: "Qwen 1.5 (Tiny - 0.5B)",
            description: "Ultra small and efficient model for mobile & web (under 300MB)"
          },
          {
            id: "TinyLlama-1.1B-Chat",
            name: "TinyLlama (Mini - 1.1B)",
            description: "A tiny but capable model, ideal for mobile & web use"
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading WebLLM models:", error);
      // Fallback to defaults on error
      setModels([
        {
          id: "Qwen1.5-0.5B-Chat",
          name: "Qwen 1.5 (Tiny - 0.5B)",
          description: "Ultra small and efficient model for mobile & web (under 300MB)"
        }
      ]);
    }
  }, []);
  
  const handleModelChange = (modelId: string) => {
    const modelOptions: ModelOptions = {
      modelId,
      temperature: 0.7,
      maxTokens: modelId.includes("phi") ? 512 : 1024,
      repetitionPenalty: 1.1
    };
    onModelChange(modelOptions);
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
        <span>Select AI Model</span>
        {isLoading && (
          <span className="flex items-center text-primary">
            <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {models.length > 0 ? (
          models.map((model) => (
            <button
              key={model.id}
              className={`text-left p-2 rounded-md text-xs transition-colors ${
                currentModel === model.id
                  ? "bg-primary bg-opacity-20 border border-primary"
                  : "bg-gray-800 border border-gray-700 hover:border-gray-600"
              }`}
              onClick={() => handleModelChange(model.id)}
              disabled={isLoading}
            >
              <div className="font-medium">{model.name}</div>
              <div className="text-[10px] text-gray-400 line-clamp-2">
                {model.description}
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-2 text-center py-2 text-gray-400 text-xs">
            Loading available models...
          </div>
        )}
      </div>
    </div>
  );
};