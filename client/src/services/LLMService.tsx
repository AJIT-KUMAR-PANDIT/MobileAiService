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
  modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC", // Using Qwen2.5-0.5B-Instruct-q0f32-MLC as default
  temperature: 0.7,
  maxTokens: 512,
  repetitionPenalty: 1.1,
};

// Fallback model config (same as default for reliability)
const fallbackModelOptions: ModelOptions = {
  modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC", // Using same model as fallback
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
    const requestPersistentStorage = async (): Promise<boolean> => {
      const isCapacitor = typeof (window as any).Capacitor !== "undefined";
      const desiredStorageSize = 3 * 1024 * 1024 * 1024; // 3GB in bytes

      try {
        const sessionStorageKey = "luna-storage-permission-requested";
        const alreadyRequestedThisSession =
          sessionStorage.getItem(sessionStorageKey) === "true";
        const localStorageKey = "luna-storage-permission-granted";
        const alreadyGrantedPreviously =
          localStorage.getItem(localStorageKey) === "true";

        if (alreadyRequestedThisSession) {
          console.log(
            "Storage permission already requested in this session, skipping prompt"
          );
          return alreadyGrantedPreviously || false;
        }

        sessionStorage.setItem(sessionStorageKey, "true");

        if (isCapacitor) {
          try {
            const capacitorPreferences = await import(
              "@capacitor/preferences"
            ).catch(() => null);
            const capacitorDialog = await import("@capacitor/dialog").catch(
              () => null
            );

            if (capacitorPreferences && capacitorDialog) {
              const Preferences = capacitorPreferences.Preferences;
              const Dialog = capacitorDialog.Dialog;

              const { value } = await Preferences.get({
                key: "storage-permission-asked",
              });

              if (value !== "true") {
                const { value: userChoice } = await Dialog.confirm({
                  title: "Storage Permission",
                  message:
                    "Luna AI needs to store data on your device to work offline. Allow Luna to use device storage?",
                  okButtonTitle: "Allow",
                  cancelButtonTitle: "Deny",
                });

                if (userChoice) {
                  await Preferences.set({
                    key: "storage-permission-asked",
                    value: "true",
                  });
                  localStorage.setItem(localStorageKey, "true");
                  console.log("Storage permission granted by user on mobile");
                  return true;
                } else {
                  console.warn("Storage permission denied by user on mobile");
                  localStorage.setItem(localStorageKey, "false");
                  return false;
                }
              }
              return value === "true";
            } else {
              throw new Error("Capacitor modules not available");
            }
          } catch (importError) {
            console.warn(
              "Capacitor modules not available, using browser fallback:",
              importError
            );
          }
        }

        if (navigator.storage && navigator.storage.persist) {
          const isPersisted = await navigator.storage.persisted();
          console.log(`Storage already persisted: ${isPersisted}`);

          if (isPersisted) {
            localStorage.setItem(localStorageKey, "true");
            return true;
          }

          if (!alreadyGrantedPreviously) {
            if (navigator.permissions) {
              try {
                const permissionStatus = await navigator.permissions.query({
                  name: "persistent-storage" as PermissionName,
                });

                if (permissionStatus.state === "granted") {
                  const persistResult = await navigator.storage.persist();
                  localStorage.setItem(
                    localStorageKey,
                    persistResult ? "true" : "false"
                  );
                  return persistResult;
                } else if (permissionStatus.state === "prompt") {
                  const userConsent = window.confirm(
                    "Luna AI needs to store data on your device to work offline. Allow Luna to use browser storage?"
                  );

                  if (userConsent) {
                    const persistResult = await navigator.storage.persist();
                    localStorage.setItem(
                      localStorageKey,
                      persistResult ? "true" : "false"
                    );
                    return persistResult;
                  } else {
                    localStorage.setItem(localStorageKey, "false");
                    return false;
                  }
                }
                return false;
              } catch (permError) {
                console.warn("Permission API error:", permError);
              }
            }

            const userConsent = window.confirm(
              "Luna AI needs to store data on your device to work offline. Allow Luna to use browser storage?"
            );

            if (userConsent) {
              const persistResult = await navigator.storage.persist();
              localStorage.setItem(
                localStorageKey,
                persistResult ? "true" : "false"
              );
              return persistResult;
            } else {
              localStorage.setItem(localStorageKey, "false");
              return false;
            }
          }

          return await navigator.storage.persist();
        }

        return false;
      } catch (error) {
        console.error("Error requesting persistent storage:", error);
        return false;
      }
    };

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

    requestPersistentStorage()
      .then((isPersisted) => {
        console.log(`Final persistence status before DB open: ${isPersisted}`);

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

            if (percentUsed > 80) {
              console.warn(
                "Storage usage is high. Attempting to clear old caches..."
              );
              clearOldCaches();
            }
          });
        }

        attemptOpenDB();
      })
      .catch((error) => {
        console.error("Error in persistence request:", error);
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

// Save model data to IndexedDB with improved quota handling
export const saveModelToIndexedDB = async (
  modelId: string,
  modelData: any
): Promise<boolean> => {
  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
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

        request.onsuccess = () => resolve(true);
        request.onerror = (event: Event) => {
          const target = event.target as IDBRequest;
          console.error("Error saving model:", target?.error);
          reject(target?.error || new Error("Unknown IndexedDB error"));
        };
      });
    } catch (error) {
      const err = error as Error;
      if (
        (err.name === "QuotaExceededError" ||
          err.message.includes("quota") ||
          err.message.includes("storage") ||
          err.message.includes("full")) &&
        retries < maxRetries
      ) {
        console.warn(
          `Storage quota exceeded (attempt ${retries + 1}/${
            maxRetries + 1
          }), performing aggressive cleanup...`
        );

        await clearOldCaches();

        if (retries > 0) {
          try {
            console.log(
              "Performing emergency cleanup - removing other models..."
            );
            const db = await initializeDB();
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();

            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                const record = cursor.value;
                if (record && record.id !== modelId) {
                  console.log(`Emergency cleanup: removing model ${record.id}`);
                  cursor.delete();
                }
                cursor.continue();
              }
            };

            await new Promise((resolve) => {
              transaction.oncomplete = resolve;
            });

            if (navigator.storage && navigator.storage.persist) {
              const isPersisted = await navigator.storage.persist();
              console.log(
                `Storage persistence after emergency cleanup: ${isPersisted}`
              );
            }

            if (navigator.storage && navigator.storage.estimate) {
              const estimate = await navigator.storage.estimate();
              const used = estimate.usage || 0;
              const quota = estimate.quota || 0;
              console.log(
                `Storage after emergency cleanup: ${formatByteSize(
                  used
                )}/${formatByteSize(quota)}`
              );
            }
          } catch (cleanupError) {
            console.error("Error during emergency cleanup:", cleanupError);
          }
        }

        retries++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error("Error saving model to IndexedDB:", error);
        return false;
      }
    }
  }

  console.error(`Failed to save model after ${maxRetries} retries`);
  return false;
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
      setIsModelLoaded(false);
      setError(null);
      console.log("Starting model load process...");

      const { modelId } = modelOptions;
      console.log("Using model ID:", modelId);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Model loading timeout - please check your internet connection and try again"
              )
            ),
          300000
        );
      });

      let readableName = modelId;

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

      const modelExists = await checkModelExists(modelId);
      console.log(`Model ${modelId} exists in IndexedDB: ${modelExists}`);

      if (model && isModelLoaded) {
        const currentModelId = (await model.getModelId?.()) || "";
        if (currentModelId === modelId) {
          console.log(`Model ${modelId} already loaded in memory, reusing it`);
          return model;
        } else {
          console.log(
            `Closing current model to load a different one: ${modelId}`
          );
          await model.close?.();
        }
      }

      if (modelExists) {
        console.log(
          `Model ${modelId} found in IndexedDB cache, loading from cache`
        );
        try {
          const cachedModel = await loadModelFromIndexedDB(modelId);
          if (cachedModel) {
            console.log("Initializing engine with cached model data");
            const engine = (await CreateMLCEngine(modelId, {
              initProgressCallback: (report: InitProgressReport) => {
                console.log("Loading cached model progress:", report.progress);
              },
            })) as unknown as ModelEngine;

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

      setIsDownloading(true);
      setDownloadProgress(0);

      let retryCount = 0;
      const maxRetries = 3;
      let engine = null;

      const fetchWithRetry = async (
        url: string,
        options: RequestInit = {},
        maxAttempts = 5
      ) => {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            console.log(`Fetching ${url} - attempt ${attempt}/${maxAttempts}`);

            if (url.includes("params_shard")) {
              console.log(`Starting download of parameter shard: ${url}`);

              const response = await fetch(url, {
                ...options,
                cache: attempt > 1 ? "no-cache" : "default",
                signal: AbortSignal.timeout(1200000), // 20 min timeout for parameter shards
              });

              if (!response.ok) {
                throw new Error(
                  `HTTP error ${response.status}: ${response.statusText}`
                );
              }

              const contentLength = response.headers.get("content-length");
              if (contentLength) {
                const total = parseInt(contentLength, 10);
                console.log(`Parameter shard size: ${formatByteSize(total)}`);

                const reader = response.body?.getReader();
                let receivedLength = 0;
                let chunks = [];
                let lastLogTime = Date.now();

                while (true && reader) {
                  const { done, value } = await reader.read();

                  if (done) {
                    console.log(`Parameter shard download complete: ${url}`);
                    break;
                  }

                  chunks.push(value);
                  receivedLength += value.length;

                  const now = Date.now();
                  if (now - lastLogTime > 3000) {
                    const percentComplete = (
                      (receivedLength / total) *
                      100
                    ).toFixed(2);
                    console.log(
                      `Download progress: ${percentComplete}% (${formatByteSize(
                        receivedLength
                      )}/${formatByteSize(total)})`
                    );
                    lastLogTime = now;
                  }
                }

                const chunksAll = new Uint8Array(receivedLength);
                let position = 0;
                for (let chunk of chunks) {
                  chunksAll.set(chunk, position);
                  position += chunk.length;
                }

                return new Response(chunksAll, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                });
              }

              return response;
            } else {
              const response = await fetch(url, {
                ...options,
                cache: attempt > 1 ? "no-cache" : "default",
                signal: AbortSignal.timeout(600000), // 10 min timeout for other files
              });

              if (!response.ok) {
                throw new Error(
                  `HTTP error ${response.status}: ${response.statusText}`
                );
              }

              return response;
            }
          } catch (error) {
            lastError = error;
            console.warn(`Fetch attempt ${attempt} failed for ${url}:`, error);

            if (attempt < maxAttempts) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
              console.log(`Retrying in ${delay / 1000}s...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        throw lastError;
      };

      const originalFetch = window.fetch;
      const fetchController = new AbortController();

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;

        if (url.includes("params_shard") || url.includes(".bin")) {
          console.log(`Intercepting parameter shard request: ${url}`);
          return fetchWithRetry(
            url,
            {
              ...init,
              signal: fetchController.signal,
              keepalive: true,
            },
            5
          );
        }

        return originalFetch(input, init);
      };

      while (retryCount <= maxRetries && !engine) {
        try {
          console.log(`Attempt ${retryCount + 1} to load model ${modelId}`);

          const enginePromise = CreateMLCEngine(modelId, {
            initProgressCallback: (report: InitProgressReport) => {
              requestAnimationFrame(() => {
                setDownloadProgress(report.progress * 100);
                const matches = report.text.match(/(\d+)\/(\d+)(MB|KB|B)/i);
                if (matches && matches.length >= 3) {
                  setDownloadSize(matches[1] + matches[3]);
                  setTotalSize(matches[2] + matches[3]);
                }
              });
            },
          }) as unknown as Promise<ModelEngine>;

          engine = (await Promise.race([
            enginePromise,
            timeoutPromise,
          ])) as ModelEngine;

          break;
        } catch (loadError) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, loadError);

          if (retryCount <= maxRetries) {
            console.log(`Retrying in 3 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } else {
            fetchController.abort();
            throw loadError;
          }
        } finally {
          window.fetch = originalFetch;
          fetchController.abort();
        }
      }

      if (!engine) {
        throw new Error("Failed to load model after multiple attempts");
      }

      setModel(engine);
      setIsModelLoaded(true);
      setIsDownloading(false);

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

      const currentModelId = modelOptions.modelId;
      const fallbackModelId = fallbackModelOptions.modelId;

      if (currentModelId !== fallbackModelId) {
        console.log("Trying fallback model:", fallbackModelId);
        setModelOptions(fallbackModelOptions);
        return null;
      }

      return null;
    }
  }, [modelOptions]);

  const changeModel = useCallback(
    (newOptions: Partial<ModelOptions>) => {
      setModelOptions({ ...modelOptions, ...newOptions });
    },
    [modelOptions]
  );

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

        const formattedMessages: ChatMessage[] = [];

        if (systemPrompt) {
          formattedMessages.push({ role: "system", content: systemPrompt });
        }

        messages.forEach((msg: Message) => {
          formattedMessages.push({ role: msg.role, content: msg.content });
        });

        const response = await model.chat({
          messages: formattedMessages,
          temperature: modelOptions.temperature,
          max_tokens: modelOptions.maxTokens,
          repetition_penalty: modelOptions.repetitionPenalty,
        });

        setIsInferring(false);

        try {
          if (response.choices && response.choices.length > 0) {
            const choice = response.choices[0] as any;

            if (choice.delta && typeof choice.delta.content !== "undefined") {
              return choice.delta.content || "";
            }

            if (
              choice.content !== undefined &&
              typeof choice.content === "string"
            ) {
              return choice.content;
            }

            if (choice.message && typeof choice.message.content === "string") {
              return choice.message.content;
            }

            if (choice.text !== undefined && typeof choice.text === "string") {
              return choice.text;
            }
          }

          const anyResponse = response as any;
          if (typeof anyResponse.content === "string") {
            return anyResponse.content;
          }

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

const clearOldCaches = async (): Promise<void> => {
  try {
    console.log("Starting comprehensive cache cleanup...");

    let totalFreed = 0;
    let cacheCleanupCount = 0;
    let modelCleanupCount = 0;

    if ("caches" in window) {
      try {
        const cacheNames = await window.caches.keys();
        console.log(`Found ${cacheNames.length} cache entries to process`);

        const oldCachePromises = cacheNames.map(async (cacheName) => {
          if (cacheName !== "webllm-v1") {
            try {
              let cacheSize = 0;
              try {
                const cache = await window.caches.open(cacheName);
                const keys = await cache.keys();
                cacheSize = keys.length;
              } catch (sizeError) {}

              const deleted = await window.caches.delete(cacheName);
              if (deleted) {
                cacheCleanupCount++;
                console.log(
                  `Deleted cache: ${cacheName} (contained ~${cacheSize} items)`
                );
              }
              return deleted;
            } catch (err) {
              console.warn(`Failed to delete cache ${cacheName}:`, err);
              return false;
            }
          }
          return false;
        });

        const results = await Promise.all(oldCachePromises);
        const deletedCount = results.filter(Boolean).length;
        console.log(`Cleared ${deletedCount} old caches`);

        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const quota = estimate.quota || 0;
          console.log(
            `Storage after cache cleanup: ${formatByteSize(
              used
            )}/${formatByteSize(quota)} (${((used / quota) * 100).toFixed(1)}%)`
          );

          const desiredStorageSize = 3 * 1024 * 1024 * 1024; // 3GB in bytes
          console.log("Requesting increased storage quota (3GB)...");
          try {
            const isPersistent = await navigator.storage.persist();
            console.log(
              `Persistent storage ${isPersistent ? "granted" : "denied"}`
            );

            if ("webkitTemporaryStorage" in navigator) {
              navigator.webkitTemporaryStorage.requestQuota(
                desiredStorageSize,
                (grantedBytes: number) => {
                  console.log(
                    `New temporary quota granted: ${formatByteSize(
                      grantedBytes
                    )}`
                  );
                },
                (error: Error) => {
                  console.warn("Error requesting temporary quota:", error);
                }
              );
            }

            if ("webkitPersistentStorage" in navigator) {
              navigator.webkitPersistentStorage.requestQuota(
                desiredStorageSize,
                (grantedBytes: number) => {
                  console.log(
                    `New persistent quota granted: ${formatByteSize(
                      grantedBytes
                    )}`
                  );
                },
                (error: Error) => {
                  console.warn("Error requesting persistent quota:", error);
                }
              );
            }
          } catch (persistError) {
            console.warn("Error requesting persistent storage:", persistError);
          }
        }
      } catch (cacheError) {
        console.warn("Error clearing browser caches:", cacheError);
      }
    }

    try {
      const db = await initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const getAllRequest = store.getAll();
      const models = await new Promise<any[]>((resolve) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => resolve([]);
      });

      console.log(`Found ${models.length} models in IndexedDB`);

      models.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const modelsToDelete: string[] = [];

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      models.forEach((model) => {
        if (model.timestamp && model.timestamp < twoWeeksAgo) {
          modelsToDelete.push(model.id);
        }
      });

      if (models.length > 3) {
        for (let i = 0; i < models.length - 3; i++) {
          if (!modelsToDelete.includes(models[i].id)) {
            modelsToDelete.push(models[i].id);
          }
        }
      }

      for (const modelId of modelsToDelete) {
        try {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(modelId);
            deleteRequest.onsuccess = () => {
              modelCleanupCount++;
              console.log(`Removed model: ${modelId}`);
              resolve();
            };
            deleteRequest.onerror = () =>
              reject(new Error(`Failed to delete model ${modelId}`));
          });
        } catch (deleteError) {
          console.warn(`Error deleting model ${modelId}:`, deleteError);
        }
      }

      console.log(`Cleared ${modelCleanupCount} models from IndexedDB`);

      const isIoTEnvironment =
        window.location.hostname.includes("iot") ||
        navigator.userAgent.includes("IoT") ||
        document.title.includes("IoT");

      if (isIoTEnvironment && models.length > 1) {
        console.log("IoT environment detected, performing additional cleanup");
        const mostRecentModel = models[models.length - 1]?.id;

        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value;
            if (record && record.id !== mostRecentModel) {
              console.log(`IoT cleanup: removing model ${record.id}`);
              cursor.delete();
              modelCleanupCount++;
            }
            cursor.continue();
          }
        };

        await new Promise((resolve) => {
          transaction.oncomplete = resolve;
        });
      }
    } catch (dbError) {
      console.warn("Error clearing old IndexedDB data:", dbError);
    }

    console.log(
      `Cleanup complete: Removed ${cacheCleanupCount} caches and ${modelCleanupCount} models`
    );

    if (navigator.storage && navigator.storage.estimate) {
      const finalEstimate = await navigator.storage.estimate();
      const used = finalEstimate.usage || 0;
      const quota = finalEstimate.quota || 0;
      console.log(
        `Final storage status: ${formatByteSize(used)}/${formatByteSize(
          quota
        )} (${((used / quota) * 100).toFixed(1)}%)`
      );
    }
  } catch (error) {
    console.error("Error in clearOldCaches:", error);
  }
};

export const requestIncreasedStorageQuota = async (): Promise<void> => {
  const desiredStorageSize = 3 * 1024 * 1024 * 1024; // 3GB in bytes

  console.log("Requesting increased storage quota (3GB)...");

  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersistent = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersistent ? "granted" : "denied"}`);
    }

    if ("webkitTemporaryStorage" in navigator) {
      await new Promise<void>((resolve) => {
        navigator.webkitTemporaryStorage.requestQuota(
          desiredStorageSize,
          (grantedBytes: number) => {
            console.log(
              `IndexedDB quota granted: ${formatByteSize(grantedBytes)}`
            );
            resolve();
          },
          (error: Error) => {
            console.warn("Error requesting IndexedDB quota:", error);
            resolve();
          }
        );
      });
    }

    if ("webkitPersistentStorage" in navigator) {
      await new Promise<void>((resolve) => {
        navigator.webkitPersistentStorage.requestQuota(
          desiredStorageSize,
          (grantedBytes: number) => {
            console.log(
              `Cache storage quota granted: ${formatByteSize(grantedBytes)}`
            );
            resolve();
          },
          (error: Error) => {
            console.warn("Error requesting cache storage quota:", error);
            resolve();
          }
        );
      });
    }

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      console.log(
        `Storage after quota request: ${formatByteSize(
          estimate.usage || 0
        )}/${formatByteSize(estimate.quota || 0)}`
      );
    }
  } catch (error) {
    console.error("Error requesting increased storage quota:", error);
  }
};
