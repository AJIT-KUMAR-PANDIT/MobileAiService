import { useEffect, useState, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { Message, ModelData, ModelOptions } from "../types/llm";

// Default model config options
const defaultModelOptions: ModelOptions = {
  modelId: "Xenova/gemma-2b",
  temperature: 0.7,
  maxTokens: 2048,
  repetitionPenalty: 1.1,
};

// IndexedDB configuration
const DB_NAME = "webllm-cache";
const STORE_NAME = "models";
const DB_VERSION = 1;

// Initialize IndexedDB
const initializeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error("Error opening IndexedDB:", event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// Check if model exists in IndexedDB
const checkModelExists = async (modelId) => {
  try {
    const db = await initializeDB();
    return new Promise((resolve) => {
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
const saveModelToIndexedDB = async (modelId, modelData) => {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: modelId, data: modelData, timestamp: Date.now() });
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error("Error saving model:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error saving model to IndexedDB:", error);
    return false;
  }
};

// Load model data from IndexedDB
const loadModelFromIndexedDB = async (modelId) => {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
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
      
      request.onerror = (event) => {
        console.error("Error loading model:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error loading model from IndexedDB:", error);
    return null;
  }
};

// Format bytesize to human readable
const formatByteSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  else return (bytes / 1073741824).toFixed(2) + " GB";
};

// Main hook for LLM service
export const useLLMService = (options = defaultModelOptions) => {
  const [modelOptions, setModelOptions] = useState(options);
  const [model, setModel] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSize, setDownloadSize] = useState("0 MB");
  const [totalSize, setTotalSize] = useState("Unknown");
  const [modelName, setModelName] = useState("");
  const [isInferring, setIsInferring] = useState(false);
  const [error, setError] = useState(null);

  // Load model with WebLLM
  const loadModel = useCallback(async () => {
    try {
      // Reset states
      setIsModelLoaded(false);
      setError(null);
      
      const { modelId } = modelOptions;
      setModelName(modelId.split('/').pop());
      
      // Check if model exists in IndexedDB
      const modelExists = await checkModelExists(modelId);
      
      if (modelExists) {
        console.log(`Model ${modelId} found in IndexedDB cache`);
        // Model exists, load from IndexedDB
        const cachedModel = await loadModelFromIndexedDB(modelId);
        if (cachedModel) {
          // Initialize WebLLM with cached model
          const engine = await webllm.createEngine({
            modelId: modelId,
            useCache: true,
          });
          setModel(engine);
          setIsModelLoaded(true);
          return engine;
        }
      }
      
      // Model not in cache, download it
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const engine = await webllm.createEngine({
        modelId: modelId,
        progressCallback: (progress) => {
          if (progress.current && progress.total) {
            const percentage = (progress.current / progress.total) * 100;
            setDownloadProgress(percentage);
            setDownloadSize(formatByteSize(progress.current));
            setTotalSize(formatByteSize(progress.total));
          }
        }
      });
      
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
    } catch (err) {
      console.error("Error loading model:", err);
      setError(err.message || "Failed to load model");
      setIsDownloading(false);
      return null;
    }
  }, [modelOptions]);

  // Change model options
  const changeModel = useCallback((newOptions) => {
    setModelOptions({ ...modelOptions, ...newOptions });
  }, [modelOptions]);

  // Run inference with the loaded model
  const inference = useCallback(async (systemPrompt, messages) => {
    try {
      if (!model || !isModelLoaded) {
        throw new Error("Model not loaded");
      }
      
      setIsInferring(true);
      
      // Format conversation for the LLM
      const formattedMessages = [];
      
      // Add system prompt
      if (systemPrompt) {
        formattedMessages.push({ role: "system", content: systemPrompt });
      }
      
      // Add conversation messages
      messages.forEach((msg) => {
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
      return response.content;
    } catch (err) {
      console.error("Inference error:", err);
      setError(err.message || "Failed to generate response");
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
  };
};
