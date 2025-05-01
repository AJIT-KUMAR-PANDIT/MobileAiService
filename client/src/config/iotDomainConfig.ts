/**
 * IOT Systems Domain Configuration
 * 
 * This file configures the API requests to the iotsystemslabs.local domain 
 * and handles logging for API interactions
 */

// Base domain for all API requests
export const IOT_BASE_DOMAIN = 'https://nakprciotsystemslabs.local';

// Debug mode - when true, all API requests will be logged to console
export const DEBUG_API_REQUESTS = true;

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
 * Helper function to control smart home devices via the IoT API
 * This matches the pattern described in the prompts.json template
 * 
 * @param room The room where the device is located
 * @param device The device to control
 * @param action The action to perform (on/off/etc)
 * @param value Optional value for actions like 'set'
 * @returns Promise with the API response
 */
export async function controlSmartHomeDevice<T>(
  room: string,
  device: string,
  action: string,
  value?: number | string
): Promise<T> {
  // Construct the device control URL
  const endpoint = `${room}/${device}/${action}${value !== undefined ? `/${value}` : ''}`;
  console.log(`Sending smart home control command: ${endpoint}`);
  
  // Log the request with our custom format
  logApiRequest('GET', `${IOT_BASE_DOMAIN}/${endpoint}`);
  
  try {
    const response = await fetch(`${IOT_BASE_DOMAIN}/${endpoint}`);
    
    if (!response.ok) {
      const error = new Error(`Smart home device control failed with status ${response.status}`);
      logApiResponse(endpoint, null, error);
      throw error;
    }
    
    const data = await response.json().catch(() => ({}));
    logApiResponse(endpoint, data);
    
    return data as T;
  } catch (error) {
    logApiResponse(endpoint, null, error);
    throw error;
  }
}

export default {
  IOT_BASE_DOMAIN,
  API_ENDPOINTS,
  getApiUrl,
  makeApiRequest,
  logApiRequest,
  logApiResponse,
  controlSmartHomeDevice
};