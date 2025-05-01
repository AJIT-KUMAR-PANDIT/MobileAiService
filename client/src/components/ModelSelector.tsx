import { FC } from "react";
import { ModelOptions } from "@/types/llm";

// Define available models
const AVAILABLE_MODELS = [
  {
    id: "mlc-ai/phi-1_5-q4f16_1",
    name: "Phi-1.5 (Small - 1.3B)",
    description: "A small model optimized for mobile & web (under 300MB)"
  },
  {
    id: "mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1",
    name: "TinyLlama (Small - 1.1B)",
    description: "A lightweight chat model for mobile & web"
  },
  {
    id: "mlc-ai/RedPajama-INCITE-Base-3B-v1-q4f16_1",
    name: "RedPajama (Medium - 3B)",
    description: "A mid-sized model with good performance"
  },
  {
    id: "mlc-ai/Llama-2-7b-chat-hf-q4f16_1",
    name: "Llama 2 (Large - 7B)",
    description: "A high-quality chat model with strong reasoning"
  }
];

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
        {AVAILABLE_MODELS.map((model) => (
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
        ))}
      </div>
    </div>
  );
};