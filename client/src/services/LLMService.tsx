import { useEffect, useState, useCallback } from "react";
import {
  CreateMLCEngine,
  MLCEngine,
  MLCEngineConfig,
  InitProgressCallback,
  InitProgressReport,
  ChatCompletionChunk,
  ChatCompletionRole,
  prebuiltAppConfig,
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
  modelId: "Qwen2.5-0.5B-Instruct-q0f32-MLC", // Using Qwen2.5-0.5B-Instruct-q0f32-MLC as default
  temperature: 0.7,
  maxTokens: 512,
  repetitionPenalty: 1.1,
};

// Fallback model config (same as default for reliability)
const fallbackModelOptions: ModelOptions = {
  modelId: "Qwen2.5-0.5B-Instruct-q0f32-MLC", // Using same model as fallback
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
    // Request persistent storage with user interaction
    const requestPersistentStorage = async (): Promise<boolean> => {
      // Check if we're in a Capacitor environment (mobile)
      const isCapacitor = typeof (window as any).Capacitor !== "undefined";

      try {
        if (isCapacitor) {
          try {
            // Try to import Capacitor modules
            const capacitorPreferences = await import(
              "@capacitor/preferences"
            ).catch(() => null);
            const capacitorDialog = await import("@capacitor/dialog").catch(
              () => null
            );

            // If both modules are available, use them
            if (capacitorPreferences && capacitorDialog) {
              const Preferences = capacitorPreferences.Preferences;
              const Dialog = capacitorDialog.Dialog;

              // Check if we've already asked for permission
              const { value } = await Preferences.get({
                key: "storage-permission-asked",
              });

              if (value !== "true") {
                // Show dialog to request permission
                const { value: userChoice } = await Dialog.confirm({
                  title: "Storage Permission",
                  message:
                    "Luna AI needs to store data on your device to work offline. Allow Luna to use device storage?",
                  okButtonTitle: "Allow",
                  cancelButtonTitle: "Deny",
                });

                if (userChoice) {
                  // User granted permission, save this preference
                  await Preferences.set({
                    key: "storage-permission-asked",
                    value: "true",
                  });
                  console.log("Storage permission granted by user on mobile");
                } else {
                  console.warn("Storage permission denied by user on mobile");
                }
              }
            } else {
              // Fallback to browser approach if modules aren't available
              throw new Error("Capacitor modules not available");
            }
          } catch (importError) {
            console.warn(
              "Capacitor modules not available, using browser fallback:",
              importError
            );
            // Use browser approach as fallback
            if (navigator.storage && navigator.storage.persist) {
              const isPersisted = await navigator.storage.persisted();
              if (!isPersisted) {
                const granted = await navigator.storage.persist();
                console.log(
                  `Persistent storage on mobile (browser fallback): ${granted}`
                );
              }
            }
          }
        } else {
          // For web browsers - improved implementation
          if (navigator.storage && navigator.storage.persist) {
            // Check current persistence state
            let isPersisted = await navigator.storage.persisted();
            console.log(
              `Persistent storage status before request: ${isPersisted}`
            );

            if (!isPersisted) {
              // First try the permission request API if available
              if (navigator.permissions) {
                try {
                  const permissionStatus = await navigator.permissions.query({
                    name: "persistent-storage" as PermissionName,
                  });

                  console.log(
                    `Storage permission status: ${permissionStatus.state}`
                  );

                  // If permission is already granted, try to persist
                  if (permissionStatus.state === "granted") {
                    isPersisted = await navigator.storage.persist();
                  }
                  // Otherwise show the dialog
                  else {
                    const userConsent = window.confirm(
                      "Luna AI needs to store data on your device to work offline. Allow Luna to use browser storage?"
                    );

                    if (userConsent) {
                      isPersisted = await navigator.storage.persist();
                    }
                  }
                } catch (permError) {
                  console.warn("Permission API error:", permError);
                  // Fallback to direct persist request
                  const userConsent = window.confirm(
                    "Luna AI needs to store data on your device to work offline. Allow Luna to use browser storage?"
                  );

                  if (userConsent) {
                    isPersisted = await navigator.storage.persist();
                  }
                }
              } else {
                // Direct persist request if permissions API not available
                const userConsent = window.confirm(
                  "Luna AI needs to store data on your device to work offline. Allow Luna to use browser storage?"
                );

                if (userConsent) {
                  isPersisted = await navigator.storage.persist();
                }
              }

              console.log(
                `Persistent storage after user consent: ${isPersisted}`
              );
            }

            return isPersisted;
          }
        }

        return false;
      } catch (error) {
        console.error("Error requesting persistent storage:", error);
        return false;
      }
    };

    // 定义重试变量
    let retryCount = 0;
    const maxRetries = 3;

    const attemptOpenDB = () => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event: Event) => {
        const target = event.target as IDBOpenDBRequest;
        console.error("Error opening IndexedDB:", target.error);

        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying IndexedDB open (${retryCount}/${maxRetries})...`
          );
          setTimeout(attemptOpenDB, 1000);
        } else {
          reject(target.error || new Error("Unknown IndexedDB error"));
        }
      };

      request.onsuccess = (event: Event) => {
        const target = event.target as IDBOpenDBRequest;
        console.log("IndexedDB opened successfully");
        resolve(target.result);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
          console.log(`Created object store: ${STORE_NAME}`);
        }
      };
    };

    // 请求持久化存储并打开数据库
    requestPersistentStorage()
      .then((isPersisted) => {
        console.log(`Final persistence status before DB open: ${isPersisted}`);

        // Estimate and request storage if available
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then((estimate) => {
            const totalBytes = estimate.quota || 0;
            const usedBytes = estimate.usage || 0;
            const percentUsed = (usedBytes / totalBytes) * 100;
            console.log(
              `Storage usage: ${formatByteSize(usedBytes)} of ${formatByteSize(
                totalBytes
              )} (${percentUsed.toFixed(2)}%)`
            );

            // If we're using more than 80% of storage, try to clear old caches
            if (percentUsed > 80) {
              console.warn(
                "Storage usage is high. Attempting to clear old caches..."
              );
              clearOldCaches();
            }
          });
        }

        // Start the DB open process
        attemptOpenDB();
      })
      .catch((error) => {
        console.error("Error in persistence request:", error);
        // 即使持久化失败，也尝试打开数据库
        attemptOpenDB();
      });
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
const saveModelToIndexedDB = async (
  modelId: string,
  modelData: any
): Promise<boolean> => {
  try {
    const db = await initializeDB();
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        id: modelId,
        data: modelData,
        timestamp: Date.now(),
      });

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

// Type for the model engine - update to include getModelId
interface ModelEngine {
  chat: (params: {
    messages: ChatMessage[];
    temperature: number;
    max_tokens: number;
    repetition_penalty: number;
  }) => Promise<ChatCompletionChunk>;
  save: () => Promise<any>;
  close?: () => void;
  getModelId?: () => Promise<string>;
}

// Main hook for LLM service
export const useLLMService = (options = defaultModelOptions) => {
  const [modelOptions, setModelOptions] = useState<ModelOptions>(options);
  const [model, setModel] = useState<ModelEngine | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSize, setDownloadSize] = useState<string>("0 MB");
  const [totalSize, setTotalSize] = useState<string>("3.0 GB");
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
  
      // Add timeout for model loading with a longer duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Model loading timeout - please check your internet connection and try again")), 300000); // Increased to 5 minutes
      });
  
      // Format readable model name from the technical ID
      let readableName = modelId;
  
      // Handle different model ID patterns
      if (modelId.includes("Qwen")) {
        readableName = "Luna (qwen 2.5)";
      } else if (modelId.includes("TinyLlama")) {
        readableName = "TinyLlama";
      } else if (modelId.includes("Phi")) {
        readableName = "Phi-2";
      } else if (modelId.includes("Llama-3.2-1B")) {
        readableName = "Llama 3.2 1B";
      } else if (modelId.includes("Llama")) {
        readableName = "Llama 2";
      }
  
      console.log("Model readable name:", readableName);
      setModelName(readableName);
  
      // Check if model exists in IndexedDB
      const modelExists = await checkModelExists(modelId);
      console.log(`Model ${modelId} exists in IndexedDB: ${modelExists}`);
  
      // Check if model is already loaded in memory
      if (model && isModelLoaded) {
        // If the current loaded model is the same as requested, reuse it
        const currentModelId = (await model.getModelId?.()) || "";
        if (currentModelId === modelId) {
          console.log(`Model ${modelId} already loaded in memory, reusing it`);
          return model;
        } else {
          // Different model requested, close the current one
          console.log(
            `Closing current model to load a different one: ${modelId}`
          );
          await model.close?.();
        }
      }
  
      // In the loadModel function, update the CreateMLCEngine call
      if (modelExists) {
        console.log(
          `Model ${modelId} found in IndexedDB cache, loading from cache`
        );
        try {
          // Model exists, load from IndexedDB
          const cachedModel = await loadModelFromIndexedDB(modelId);
          if (cachedModel) {
            // Initialize WebLLM with cached model
            console.log("Initializing engine with cached model data");
            const engine = (await CreateMLCEngine(modelId, {
              // Remove useIndexedDB property and use the correct config options
              initProgressCallback: (report: InitProgressReport) => {
                console.log("Loading cached model progress:", report.progress);
              },
            })) as unknown as ModelEngine;
  
            // Add a getModelId method if it doesn't exist
            if (!engine.getModelId) {
              engine.getModelId = () => Promise.resolve(modelId);
            }
  
            setModel(engine);
            setIsModelLoaded(true);
            return engine;
          } else {
            console.warn(
              "Model exists in IndexedDB but data couldn't be loaded, will download fresh"
            );
          }
        } catch (cacheError) {
          console.error("Error loading model from cache:", cacheError);
          console.log("Will attempt to download fresh model");
        }
      }
  
      // Model not in cache or cache loading failed, download it
      setIsDownloading(true);
      setDownloadProgress(0);
  
      // Add retry mechanism for model loading
      let retryCount = 0;
      const maxRetries = 2;
      let engine = null;
  
      while (retryCount <= maxRetries && !engine) {
        try {
          console.log(`Attempt ${retryCount + 1} to load model ${modelId}`);
  
          const enginePromise = CreateMLCEngine(modelId, {
            initProgressCallback: (report: InitProgressReport) => {
              setDownloadProgress(report.progress * 100);
              const matches = report.text.match(/(\d+)\/(\d+)(MB|KB|B)/i);
              if (matches && matches.length >= 3) {
                setDownloadSize(matches[1] + matches[3]);
                setTotalSize(matches[2] + matches[3]);
              }
            },
          }) as unknown as Promise<ModelEngine>;
  
          // Race between timeout and model loading
          engine = (await Promise.race([
            enginePromise,
            timeoutPromise,
          ])) as ModelEngine;
  
          break; // If successful, exit the retry loop
        } catch (loadError) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, loadError);
  
          if (retryCount <= maxRetries) {
            console.log(`Retrying in 3 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
          } else {
            throw loadError; // Re-throw if all retries failed
          }
        }
      }
  
      if (!engine) {
        throw new Error("Failed to load model after multiple attempts");
      }
  
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load model";
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
  const changeModel = useCallback(
    (newOptions: Partial<ModelOptions>) => {
      setModelOptions({ ...modelOptions, ...newOptions });
    },
    [modelOptions]
  );

  // Run inference with the loaded model
  const inference = useCallback(
    async (
      systemPrompt: string | null,
      messages: Message[]
    ): Promise<string> => {
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
            if (choice.delta && typeof choice.delta.content !== "undefined") {
              return choice.delta.content || "";
            }

            // Direct content in the choice (some implementations)
            if (
              choice.content !== undefined &&
              typeof choice.content === "string"
            ) {
              return choice.content;
            }

            // Try to access nested message property (OpenAI-compatible format)
            if (choice.message && typeof choice.message.content === "string") {
              return choice.message.content;
            }

            // Try text property (older model formats)
            if (choice.text !== undefined && typeof choice.text === "string") {
              return choice.text;
            }
          }

          // Custom model response format: might be directly on the response object
          const anyResponse = response as any;
          if (typeof anyResponse.content === "string") {
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
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate response";
        setError(errorMessage);
        setIsInferring(false);
        throw err;
      }
    },
    [model, isModelLoaded, modelOptions]
  );

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

// Clear old caches to free up space
const clearOldCaches = async (): Promise<void> => {
  try {
    // Clear old service worker caches if available
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      const oldCachePromises = cacheNames.map((cacheName) => {
        // Keep only the current cache version
        if (cacheName !== "webllm-v1") {
          return window.caches.delete(cacheName);
        }
        return Promise.resolve(false);
      });

      await Promise.all(oldCachePromises);
      console.log("Old caches cleared");
    }

    // Clear old IndexedDB data (models older than 30 days)
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const record = cursor.value;
        if (record.timestamp && record.timestamp < thirtyDaysAgo) {
          console.log(`Removing old model: ${record.id}`);
          cursor.delete();
        }
        cursor.continue();
      }
    };

    console.log("Checked for old model data to clear");
  } catch (error) {
    console.error("Error clearing caches:", error);
  }
};
