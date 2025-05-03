import { saveModelToIndexedDB } from "../services/LLMService";

/**
 * Scans browser caches for model files and syncs them to IndexedDB
 * @param modelIdHints Optional array of model IDs to specifically look for
 * @returns Promise with results of the sync operation
 */
export const cacheToIndexDb = async (modelIdHints?: string[]): Promise<{
  success: boolean;
  syncedModels: string[];
  errors: string[];
}> => {
  const result = {
    success: false,
    syncedModels: [] as string[],
    errors: [] as string[],
  };

  try {
    console.log("Starting cache to IndexedDB sync operation...");
    
    // Check if Cache API is available
    if (!('caches' in window)) {
      result.errors.push("Cache API not available in this browser");
      return result;
    }

    // Get all cache stores
    const cacheNames = await window.caches.keys();
    console.log(`Found ${cacheNames.length} cache stores to check`);
    
    // Look for model-related caches (WebLLM typically uses 'webllm-v1')
    const modelCaches = cacheNames.filter(name => 
      name.includes('webllm') || name.includes('model') || name.includes('mlc')
    );
    
    if (modelCaches.length === 0) {
      console.log("No model-related caches found");
      // Check all caches if no model-specific caches found
      for (const cacheName of cacheNames) {
        await processCacheStore(cacheName, modelIdHints, result);
      }
    } else {
      // Process model-specific caches first
      for (const cacheName of modelCaches) {
        await processCacheStore(cacheName, modelIdHints, result);
      }
    }

    result.success = result.syncedModels.length > 0;
    console.log(`Cache sync complete. Synced ${result.syncedModels.length} models to IndexedDB`);
    
    if (result.errors.length > 0) {
      console.warn(`Encountered ${result.errors.length} errors during sync`);
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Global error: ${errorMessage}`);
    console.error("Error in cache to IndexedDB sync:", error);
    return result;
  }
};

/**
 * Process a single cache store to find and sync model data
 */
async function processCacheStore(
  cacheName: string, 
  modelIdHints: string[] | undefined,
  result: { syncedModels: string[], errors: string[] }
): Promise<void> {
  try {
    console.log(`Processing cache: ${cacheName}`);
    const cache = await window.caches.open(cacheName);
    const requests = await cache.keys();
    
    // Filter requests that look like model files
    const modelRequests = requests.filter(req => {
      const url = req.url;
      // Check if URL contains model identifiers
      const isModelFile = url.includes('params') || 
                          url.includes('.bin') || 
                          url.includes('model') ||
                          url.includes('weight') ||
                          url.includes('mlc');
                          
      // If we have specific model hints, check those too
      if (modelIdHints && modelIdHints.length > 0) {
        return isModelFile || modelIdHints.some(id => url.includes(id));
      }
      
      return isModelFile;
    });
    
    console.log(`Found ${modelRequests.length} potential model files in ${cacheName}`);
    
    // Group requests by potential model ID
    const modelGroups = new Map<string, Request[]>();
    
    for (const req of modelRequests) {
      // Try to extract model ID from URL
      const url = req.url;
      let modelId = "unknown";
      
      // Extract model ID using common patterns
      const urlParts = url.split('/');
      for (const part of urlParts) {
        // Look for common model naming patterns
        if (part.includes('Qwen') || 
            part.includes('Llama') || 
            part.includes('Phi') || 
            part.includes('TinyLlama')) {
          modelId = part;
          break;
        }
      }
      
      // If we have hints and found a match, use that
      if (modelIdHints) {
        for (const hint of modelIdHints) {
          if (url.includes(hint)) {
            modelId = hint;
            break;
          }
        }
      }
      
      // Group by model ID
      if (!modelGroups.has(modelId)) {
        modelGroups.set(modelId, []);
      }
      modelGroups.get(modelId)?.push(req);
    }
    
    // Process each model group
    // Convert Map.entries() to Array to avoid downlevelIteration issues
    const modelGroupsArray = Array.from(modelGroups.entries());
    
    for (const [modelId, requests] of modelGroupsArray) {
      try {
        console.log(`Processing model: ${modelId} with ${requests.length} files`);
        
        // For models with multiple files, we need to combine them
        // This is a simplified approach - actual implementation depends on model format
        if (requests.length > 0) {
          // For now, just use the first file as a representative
          const mainRequest = requests[0];
          const response = await cache.match(mainRequest);
          
          if (response) {
            const modelData = await response.arrayBuffer();
            
            // Save to IndexedDB
            const saved = await saveModelToIndexedDB(modelId, modelData);
            
            if (saved) {
              result.syncedModels.push(modelId);
              console.log(`Successfully synced model ${modelId} to IndexedDB`);
            } else {
              result.errors.push(`Failed to save model ${modelId} to IndexedDB`);
            }
          }
        }
      } catch (modelError) {
        const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
        result.errors.push(`Error processing model ${modelId}: ${errorMessage}`);
        console.error(`Error processing model ${modelId}:`, modelError);
      }
    }
  } catch (cacheError) {
    const errorMessage = cacheError instanceof Error ? cacheError.message : String(cacheError);
    result.errors.push(`Error processing cache ${cacheName}: ${errorMessage}`);
    console.error(`Error processing cache ${cacheName}:`, cacheError);
  }
}

/**
 * Utility function to run the cache sync on app startup
 * Call this from your app initialization code
 */
export const syncCacheToIndexDbOnStartup = async (): Promise<void> => {
  try {
    console.log("Running automatic cache to IndexedDB sync on startup");
    const result = await cacheToIndexDb();
    
    if (result.syncedModels.length > 0) {
      console.log(`Startup sync complete: ${result.syncedModels.length} models synced to IndexedDB`);
    } else {
      console.log("No models found to sync during startup");
    }
  } catch (error) {
    console.error("Error during startup cache sync:", error);
  }
};