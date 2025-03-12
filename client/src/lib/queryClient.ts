import { QueryClient } from '@tanstack/react-query';
import { logError } from '@/lib/error-handling';
import { v4 as uuidv4 } from 'uuid';

// Helper type for API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
  errorId?: string;
}

// Enhanced fetch function with improved error handling
export async function api<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  try {
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${requestId}] Request: ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log(`Request Body: ${options.body}`);
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...options.headers,
      },
    });
    
    const responseTime = Date.now() - startTime;
    const contentType = response.headers.get('content-type');
    
    // Handle non-JSON responses
    if (!contentType || !contentType.includes('application/json')) {
      // For 204 No Content, return empty object
      if (response.status === 204) {
        return {} as T;
      }
      
      // For other non-JSON responses, throw an error
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Non-JSON error response: ${errorText || response.statusText}`);
      }
      
      return {} as T;
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${requestId}] Response: ${response.status} (${responseTime}ms)`);
    }
    
    // Handle API error responses
    if (!response.ok) {
      const errorMessage = data.message || response.statusText;
      const errorId = data.errorId;
      const error = new Error(errorMessage) as Error & { statusCode?: number, errorId?: string };
      
      // Attach additional metadata to the error
      error.statusCode = response.status;
      error.errorId = errorId;
      
      // Log the error with context
      logError(error, {
        url,
        method: options.method || 'GET',
        status: response.status,
        responseTime,
        errorId,
        requestId,
      });
      
      throw error;
    }
    
    return data as T;
  } catch (error) {
    // Handle fetch errors (network issues, etc.)
    const responseTime = Date.now() - startTime;
    
    // Handle AbortError more gracefully (often happens during component unmounting)
    if (error instanceof Error && error.name === 'AbortError') {
      // Don't log abort errors as they are typically intentional and not actual errors
      console.debug(`Request aborted: ${options.method || 'GET'} ${url}`);
      throw error; // Still throw so React Query can handle it properly
    }
    
    // Only log errors that weren't already logged in the API error handling
    if (!(error instanceof Error && (error as any).statusCode)) {
      logError(error, {
        url,
        method: options.method || 'GET',
        responseTime,
        requestId,
        type: 'fetch_error',
      });
    }
    
    throw error;
  }
}

// Options type for query function
export type QueryFnOptions = {
  on401?: 'throw' | 'redirect';
};

// Create a query function generator for React Query
export function getQueryFn<T>(options?: QueryFnOptions) {
  return async (context: { 
    queryKey: readonly any[]; 
    signal?: AbortSignal;
    meta?: Record<string, unknown>;
  }): Promise<T> => {
    // Use the first element in query key as the endpoint
    const endpoint = context.queryKey[0] as string;
    
    // Make the API request with abort signal if provided
    return api<T>(endpoint, { signal: context.signal });
  };
}

// API request helper for mutations (POST, PUT, DELETE)
export async function apiRequest<T, U = any>(
  methodOrOptions: string | { 
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; 
    url: string;
    body?: U;
    headers?: Record<string, string>;
  },
  urlOrOptions?: string | { 
    body?: U;
    headers?: Record<string, string>;
  }
): Promise<T> {
  // Handle both usage patterns:
  // 1. apiRequest({ method: 'DELETE', url: '/api/sales/123' })
  // 2. apiRequest('DELETE', '/api/sales/123')
  
  if (typeof methodOrOptions === 'string') {
    // It's the old pattern: apiRequest('DELETE', '/api/sales/123')
    const method = methodOrOptions as 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    const url = urlOrOptions as string;
    const options = {};
    
    return api<T>(url, {
      method,
      ...options,
    });
  } else {
    // It's the new pattern: apiRequest({ method: 'DELETE', url: '/api/sales/123' })
    const { method, url, body, headers = {} } = methodOrOptions;
    
    return api<T>(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Create and export the React Query client instance with enhanced error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: Error) => {
        // Don't retry for AbortError or 404s
        if (error instanceof Error) {
          if (error.name === 'AbortError') return false;
          if ((error as any).statusCode === 404) return false;
        }
        return failureCount < 2; // Only retry twice for other errors
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
    }
  },
});

// Export the React Query utils
export { useQuery, useMutation } from '@tanstack/react-query';