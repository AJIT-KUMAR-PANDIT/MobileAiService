/**
 * IOT Systems Domain Configuration
 * 
 * This file configures the API requests to the iotsystemslabs.local domain 
 * and handles logging for API interactions.
 * It supports both web browsers and Capacitor mobile apps.
 */

// Base domain for all API requests - can be overridden by environment variables
export const IOT_BASE_DOMAIN = import.meta.env.VITE_IOT_BASE_URL || 'https://nakprciotsystemslabs.local';

// Debug mode - when true, all API requests will be logged to console
export const DEBUG_API_REQUESTS = true;

/**
 * Helper function to detect if running in a Capacitor app environment
 * @returns boolean True if running in Capacitor
 */
export function isCapacitorApp(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined' && 
         (window as any)?.Capacitor?.isNative === true;
}

// Configuration for different API endpoints
export const API_ENDPOINTS = {
  // User authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    VERIFY: '/api/auth/verify',
  },
  
  // Device management endpoints
  DEVICES: {
    LIST: '/api/devices',
    STATUS: '/api/devices/status',
    CONTROL: '/api/devices/control',
    REGISTER: '/api/devices/register',
  },
  
  // Smart home device control (direct access pattern)
  SMART_HOME: {
    // Rooms
    ROOMS: {
      LIVING_ROOM: 'living-room',
      BEDROOM: 'bedroom',
      KITCHEN: 'kitchen',
      BATHROOM: 'bathroom',
      OFFICE: 'office',
    },
    // Devices
    DEVICES: {
      LIGHT: 'light',
      FAN: 'fan',
      AC: 'ac',
      TV: 'tv',
      SPEAKER: 'speaker',
      THERMOSTAT: 'thermostat',
      CURTAIN: 'curtain',
    },
    // Actions
    ACTIONS: {
      ON: 'on',
      OFF: 'off',
      INCREASE: 'increase',
      DECREASE: 'decrease',
      SET: 'set',
    }
  },
  
  // AI model endpoints
  AI: {
    MODELS: '/api/ai/models',
    INFERENCE: '/api/ai/inference',
    FINETUNE: '/api/ai/finetune',
    CHAT: '/api/ai/chat',
    VOICE: '/api/ai/voice',
  },
  
  // User data endpoints
  USER: {
    PROFILE: '/api/user/profile',
    PREFERENCES: '/api/user/preferences',
  }
};

/**
 * Helper function to create a full API URL
 * @param endpoint The API endpoint path
 * @returns The complete URL with the IOT domain
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // When running in Capacitor, use the platform-specific URL if available
  if (isCapacitorApp()) {
    // Get custom URL from Capacitor config if available
    const capacitorDomain = (window as any)?.Capacitor?.config?.plugins?.Http?.url || 
                         import.meta.env.VITE_CAPACITOR_IOT_URL;
                          
    if (capacitorDomain) {
      const baseUrl = capacitorDomain.endsWith('/') ? capacitorDomain.slice(0, -1) : capacitorDomain;
      return `${baseUrl}/${cleanEndpoint}`;
    }
  }
  
  return `${IOT_BASE_DOMAIN}/${cleanEndpoint}`;
}

/**
 * Logs API requests when debug mode is enabled
 * @param method HTTP method (GET, POST, etc.)
 * @param url The API URL being called
 * @param data Optional request data for POST/PUT requests
 */
export function logApiRequest(method: string, url: string, data?: any): void {
  if (DEBUG_API_REQUESTS) {
    console.log(`🔌 IOT API Request: ${method} ${url}`);
    if (data) {
      console.log('Request Data:', data);
    }
  }
}

/**
 * Logs API responses when debug mode is enabled
 * @param url The API URL that was called
 * @param response The response data
 * @param error Optional error information if the request failed
 */
export function logApiResponse(url: string, response?: any, error?: any): void {
  if (DEBUG_API_REQUESTS) {
    if (error) {
      console.error(`🔌 IOT API Error for ${url}:`, error);
    } else {
      console.log(`🔌 IOT API Response for ${url}:`, response);
    }
  }
}

/**
 * Helper function to make API requests with proper logging
 * @param method HTTP method
 * @param endpoint API endpoint
 * @param data Optional request data
 * @returns Promise with the API response
 */
export async function makeApiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
  endpoint: string, 
  data?: any
): Promise<T> {
  const url = getApiUrl(endpoint);
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  // Log the outgoing request
  logApiRequest(method, url, data);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error = new Error(
        errorData?.message || `API request failed with status ${response.status}`
      );
      logApiResponse(url, null, error);
      throw error;
    }
    
    // Parse response - for empty responses (204), return empty object
    const responseData = response.status !== 204 
      ? await response.json() 
      : {};
      
    // Log the response
    logApiResponse(url, responseData);
    
    return responseData as T;
  } catch (error) {
    logApiResponse(url, null, error);
    throw error;
  }
}

/**
 * Generate a mock response for offline mode to simulate device control success
 * @param data Request data for device control
 * @returns Simulated successful response
 */
function getMockOfflineResponse(data: any): any {
  return {
    success: true,
    message: `Successfully ${data.action} the ${data.device} in ${data.room}`,
    status: 'OK',
    timestamp: new Date().toISOString(),
    data: { ...data }
  };
}

/**
 * Helper function to control smart home devices via the IoT API
 * This matches the pattern described in the prompts.json template
 * 
 * @param room The room where the device is located
 * @param device The device to control
 * @param action The action to perform (on/off/etc)
 * @param value Optional value for actions like 'set'
 * @param offlineFallback Whether to use a mock response when offline (default: true)
 * @returns Promise with the API response
 */
export async function controlSmartHomeDevice<T>(
  room: string,
  device: string,
  action: string,
  value?: number | string,
  offlineFallback: boolean = true
): Promise<T> {
  // Normalize input values
  const normalizedRoom = room.toLowerCase().trim();
  const normalizedDevice = device.toLowerCase().trim();
  const normalizedAction = action.toLowerCase().trim();
  
  // Create payload for API request (used for POST/PUT)
  const payload = {
    room: normalizedRoom,
    device: normalizedDevice,
    action: normalizedAction,
    value: value !== undefined ? value : null,
    timestamp: new Date().toISOString()
  };
  
  // Choose the appropriate endpoint format based on API design
  // Some IoT systems use REST-style paths, others use query params or POST bodies
  const restEndpoint = `${normalizedRoom}/${normalizedDevice}/${normalizedAction}${value !== undefined ? `/${value}` : ''}`;
  const apiEndpoint = API_ENDPOINTS.DEVICES.CONTROL;
  
  console.log(`Sending smart home control command: ${restEndpoint}`);
  
  // Use different approach depending on platform (web or Capacitor)
  if (isCapacitorApp() && (window as any)?.Capacitor?.Plugins?.Http) {
    // Using Capacitor's HTTP plugin for native API access
    try {
      // Log the request
      const url = getApiUrl(apiEndpoint);
      logApiRequest('POST', url, payload);
      
      // Make request using Capacitor HTTP plugin
      const response = await (window as any).Capacitor.Plugins.Http.request({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: payload
      });
      
      // Handle response
      if (!response.status || response.status < 200 || response.status >= 300) {
        const error = new Error(`Smart home device control failed with status ${response.status || 'unknown'}`);
        logApiResponse(apiEndpoint, null, error);
        
        // Offline fallback if needed
        if (offlineFallback) {
          console.log('Using offline fallback for device control');
          const mockResponse = getMockOfflineResponse(payload);
          return mockResponse as unknown as T;
        }
        
        throw error;
      }
      
      logApiResponse(apiEndpoint, response.data);
      return response.data as T;
    } catch (error) {
      logApiResponse(apiEndpoint, null, error);
      
      // Offline fallback if needed
      if (offlineFallback) {
        console.log('Using offline fallback for device control due to error');
        const mockResponse = getMockOfflineResponse(payload);
        return mockResponse as unknown as T;
      }
      
      throw error;
    }
  } else {
    // Regular web browser approach
    // Try the RESTful endpoint URL first (GET)
    const restUrl = getApiUrl(restEndpoint);
    logApiRequest('GET', restUrl);
    
    try {
      // First attempt - RESTful URL style
      const response = await fetch(restUrl);
      
      // If the REST endpoint doesn't work, try the POST API approach
      if (!response.ok) {
        console.log('RESTful endpoint failed, trying POST API...');
        
        // Try POST API approach
        return await makeApiRequest<T>('POST', apiEndpoint, payload);
      }
      
      // Parse and return the successful REST response
      const data = await response.json().catch(() => ({}));
      logApiResponse(restEndpoint, data);
      return data as T;
      
    } catch (error) {
      console.error('First attempt failed, trying POST API...', error);
      
      try {
        // Try POST API approach as fallback
        return await makeApiRequest<T>('POST', apiEndpoint, payload);
      } catch (postError) {
        logApiResponse(apiEndpoint, null, postError);
        
        // Offline fallback if needed
        if (offlineFallback) {
          console.log('Using offline fallback for device control due to error');
          const mockResponse = getMockOfflineResponse(payload);
          return mockResponse as unknown as T;
        }
        
        throw postError;
      }
    }
  }
}

/**
 * Check if the IoT system is reachable
 * @returns Promise resolving to boolean indicating if system is online
 */
export async function checkIoTSystemStatus(): Promise<boolean> {
  try {
    const response = await makeApiRequest<any>(
      'GET', 
      API_ENDPOINTS.DEVICES.STATUS,
      undefined
    );
    return response && (response.status === 'online' || response.online === true);
  } catch (error) {
    console.error('IoT system unreachable:', error);
    return false;
  }
}

export default {
  IOT_BASE_DOMAIN,
  API_ENDPOINTS,
  getApiUrl,
  makeApiRequest,
  logApiRequest,
  logApiResponse,
  controlSmartHomeDevice,
  isCapacitorApp,
  checkIoTSystemStatus
};