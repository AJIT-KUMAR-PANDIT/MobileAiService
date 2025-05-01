import { useEffect, useState, useCallback } from "react";
import { 
  CreateMLCEngine, 
  MLCEngine, 
  MLCEngineConfig,
  InitProgressCallback,
  InitProgressReport,
  ChatCompletionChunk,
  ChatCompletionRole,
  prebuiltAppConfig
} from "@mlc-ai/web-llm";
import { Message, ModelData, ModelOptions, LLMResponse } from "../types/llm";

// WebLLM types
interface ChatMessage {
  role: ChatCompletionRole;
  content: string;
}

// Download progress type
interface DownloadProgress {
  current: number;
  total: number;
}

// Default model config options
const defaultModelOptions: ModelOptions = {
  modelId: "Qwen1.5-0.5B-Chat",
  temperature: 0.7,
  maxTokens: 512,
  repetitionPenalty: 1.1,
};

// Fallback model config (even smaller)
const fallbackModelOptions: ModelOptions = {
  modelId: "TinyLlama-1.1B-Chat",
  temperature: 0.7,
  maxTokens: 256,
  repetitionPenalty: 1.1,
};

// IndexedDB configuration
const DB_NAME = "webllm-cache";
const STORE_NAME = "models";
const DB_VERSION = 1;

// Initialize IndexedDB
const initializeDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      console.error("Error opening IndexedDB:", target.error);
      reject(target.error || new Error("Unknown IndexedDB error"));
    };
    
    request.onsuccess = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      resolve(target.result);
    };
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// Check if model exists in IndexedDB
const checkModelExists = async (modelId: string): Promise<boolean> => {
  try {
    const db = await initializeDB();
    return new Promise<boolean>((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(modelId);
      
      request.onsuccess = () => {
        resolve(!!request.result);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Error checking model existence:", error);
    return false;
  }
};

// Save model data to IndexedDB
const saveModelToIndexedDB = async (modelId: string, modelData: any): Promise<boolean> => {
  try {
    const db = await initializeDB();
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: modelId, data: modelData, timestamp: Date.now() });
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event: Event) => {
        const target = event.target as IDBRequest;
        console.error("Error saving model:", target?.error);
        reject(target?.error || new Error("Unknown IndexedDB error"));
      };
    });
  } catch (error) {
    console.error("Error saving model to IndexedDB:", error);
    return false;
  }
};

// Load model data from IndexedDB
const loadModelFromIndexedDB = async (modelId: string): Promise<any> => {
  try {
    const db = await initializeDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(modelId);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event: Event) => {
        const target = event.target as IDBRequest;
        console.error("Error loading model:", target?.error);
        reject(target?.error || new Error("Unknown IndexedDB error"));
      };
    });
  } catch (error) {
    console.error("Error loading model from IndexedDB:", error);
    return null;
  }
};

// Format bytesize to human readable
const formatByteSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  else return (bytes / 1073741824).toFixed(2) + " GB";
};

// Type for the model engine
interface ModelEngine {
  chat: (params: {
    messages: ChatMessage[],
    temperature: number,
    max_tokens: number,
    repetition_penalty: number
  }) => Promise<ChatCompletionChunk>;
  save: () => Promise<any>;
  close?: () => void;
}

// Main hook for LLM service
export const useLLMService = (options = defaultModelOptions) => {
  const [modelOptions, setModelOptions] = useState<ModelOptions>(options);
  const [model, setModel] = useState<ModelEngine | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSize, setDownloadSize] = useState<string>("0 MB");
  const [totalSize, setTotalSize] = useState<string>("Unknown");
  const [modelName, setModelName] = useState<string>("");
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load model with WebLLM
  const loadModel = useCallback(async (): Promise<ModelEngine | null> => {
    try {
      // Reset states
      setIsModelLoaded(false);
      setError(null);
      console.log("Starting model load process...");
      
      const { modelId } = modelOptions;
      console.log("Using model ID:", modelId);
      
      // Format readable model name from the technical ID
      let readableName = modelId;
      
      // Handle different model ID patterns
      if (modelId.includes("Qwen")) {
        readableName = "Qwen 1.5";
      } else if (modelId.includes("TinyLlama")) {
        readableName = "TinyLlama";
      } else if (modelId.includes("Phi")) {
        readableName = "Phi-2";
      } else if (modelId.includes("Llama")) {
        readableName = "Llama 2";
      }
      
      console.log("Model readable name:", readableName);
      setModelName(readableName);
      
      // Check if model exists in IndexedDB
      const modelExists = await checkModelExists(modelId);
      
      if (modelExists) {
        console.log(`Model ${modelId} found in IndexedDB cache`);
        // Model exists, load from IndexedDB
        const cachedModel = await loadModelFromIndexedDB(modelId);
        if (cachedModel) {
          // Initialize WebLLM with cached model
          const engine = await CreateMLCEngine(
            modelId,
            { 
              initProgressCallback: (report: InitProgressReport) => {
                console.log("Loading model progress:", report.progress);
              }
            }
          ) as unknown as ModelEngine;
          setModel(engine);
          setIsModelLoaded(true);
          return engine;
        }
      }
      
      // Model not in cache, download it
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const engine = await CreateMLCEngine(
        modelId,
        {
          initProgressCallback: (report: InitProgressReport) => {
            setDownloadProgress(report.progress * 100);
            // Extract bytes from the text that may contain download information 
            // like "Downloaded 10/100MB"
            const matches = report.text.match(/(\d+)\/(\d+)(MB|KB|B)/i);
            if (matches && matches.length >= 3) {
              setDownloadSize(matches[1] + matches[3]);
              setTotalSize(matches[2] + matches[3]);
            }
          }
        }
      ) as unknown as ModelEngine;
      
      setModel(engine);
      setIsModelLoaded(true);
      setIsDownloading(false);
      
      // Save model to IndexedDB for future use
      try {
        const modelData = await engine.save();
        await saveModelToIndexedDB(modelId, modelData);
        console.log(`Model ${modelId} saved to IndexedDB cache`);
      } catch (saveError) {
        console.error("Error saving model to IndexedDB:", saveError);
      }
      
      return engine;
    } catch (err: unknown) {
      console.error("Error loading model:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load model";
      setError(errorMessage);
      setIsDownloading(false);
      
      // If the current model isn't the fallback model, try the fallback
      const currentModelId = modelOptions.modelId;
      const fallbackModelId = fallbackModelOptions.modelId;
      
      if (currentModelId !== fallbackModelId) {
        console.log("Trying fallback model:", fallbackModelId);
        setModelOptions(fallbackModelOptions);
        
        // The loadModel will be called again with the new options via the useEffect
        return null;
      }
      
      return null;
    }
  }, [modelOptions]);

  // Change model options
  const changeModel = useCallback((newOptions: Partial<ModelOptions>) => {
    setModelOptions({ ...modelOptions, ...newOptions });
  }, [modelOptions]);

  // Run inference with the loaded model
  const inference = useCallback(async (systemPrompt: string | null, messages: Message[]): Promise<string> => {
    try {
      if (!model || !isModelLoaded) {
        throw new Error("Model not loaded");
      }
      
      setIsInferring(true);
      
      // Format conversation for the LLM
      const formattedMessages: ChatMessage[] = [];
      
      // Add system prompt
      if (systemPrompt) {
        formattedMessages.push({ role: "system", content: systemPrompt });
      }
      
      // Add conversation messages
      messages.forEach((msg: Message) => {
        formattedMessages.push({ role: msg.role, content: msg.content });
      });
      
      // Generate response
      const response = await model.chat({
        messages: formattedMessages,
        temperature: modelOptions.temperature,
        max_tokens: modelOptions.maxTokens,
        repetition_penalty: modelOptions.repetitionPenalty,
      });
      
      setIsInferring(false);
      // The response might come in different formats based on the model implementation
      try {
        // For streaming response (ChatCompletionChunk)
        if (response.choices && response.choices.length > 0) {
          const choice = response.choices[0] as any;
          
          // Check delta content (WebLLM streaming format)
          if (choice.delta && typeof choice.delta.content !== 'undefined') {
            return choice.delta.content || "";
          }
          
          // Direct content in the choice (some implementations)
          if (choice.content !== undefined && typeof choice.content === 'string') {
            return choice.content;
          }
          
          // Try to access nested message property (OpenAI-compatible format)
          if (choice.message && typeof choice.message.content === 'string') {
            return choice.message.content;
          }
          
          // Try text property (older model formats)
          if (choice.text !== undefined && typeof choice.text === 'string') {
            return choice.text;
          }
        }
        
        // Custom model response format: might be directly on the response object
        const anyResponse = response as any;
        if (typeof anyResponse.content === 'string') {
          return anyResponse.content;
        }
        
        // Last resort: stringify the response and log a warning
        console.warn("Unexpected response format:", response);
        return "I'm sorry, I couldn't generate a response at this time.";
      } catch (error) {
        console.error("Error parsing model response:", error);
        return "I encountered an error processing the response. Please try again.";
      }
    } catch (err: unknown) {
      console.error("Inference error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate response";
      setError(errorMessage);
      setIsInferring(false);
      throw err;
    }
  }, [model, isModelLoaded, modelOptions]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (model) {
        model.close?.();
      }
    };
  }, [model]);

  return {
    model,
    isModelLoaded,
    isDownloading,
    downloadProgress,
    downloadSize,
    totalSize,
    modelName,
    isInferring,
    error,
    loadModel,
    changeModel,
    inference,
    modelOptions,
  };
};
