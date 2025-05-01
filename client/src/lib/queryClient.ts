import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Base API domain for IOT Systems Labs
import { IOT_BASE_DOMAIN, logApiRequest, logApiResponse } from '../config/iotDomainConfig';

export const API_BASE_URL = IOT_BASE_DOMAIN;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`Error from ${res.url}:`, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

export function getApiUrl(path: string): string {
  // Prefix paths with API_BASE_URL when they're relative
  return path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  
  // Log request using our IoT domain config logger
  logApiRequest(method, fullUrl, data);
  
  const res = await fetch(fullUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      'X-Requested-From': 'iotsystemslabs-client',
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  try {
    await throwIfResNotOk(res);
    // Clone the response to log it and still return a usable response
    const resClone = res.clone();
    const responseData = await resClone.json().catch(() => ({}));
    logApiResponse(fullUrl, responseData);
    return res;
  } catch (error) {
    logApiResponse(fullUrl, null, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getApiUrl(queryKey[0] as string);
    
    // Log API request
    logApiRequest('GET', url);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          'X-Requested-From': 'iotsystemslabs-client',
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        logApiResponse(url, null, { error: "Unauthorized (401)" });
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Log successful response
      logApiResponse(url, data);
      
      return data;
    } catch (error) {
      // Log error response
      logApiResponse(url, null, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
