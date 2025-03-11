import { QueryClient } from '@tanstack/react-query';
import { logError } from './errorHandler';
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

// Create a query function generator for React Query
export function getQueryFn<T>(baseUrl: string = '') {
  return async ({ queryKey, signal, meta }: { 
    queryKey: readonly any[]; 
    signal?: AbortSignal;
    meta?: Record<string, unknown>;
  }): Promise<T> => {
    // Use the first element in query key as the endpoint
    const endpoint = queryKey[0] as string;
    
    // Build the full URL with any query parameters
    const url = `${baseUrl}${endpoint}`;
    
    // Make the API request with abort signal if provided
    return api<T>(url, { signal });
  };
}

// API request helper for mutations (POST, PUT, DELETE)
export async function apiRequest<T, U = any>(
  url: string,
  { method = 'POST', body, headers = {} }: { 
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: U;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  return api<T>(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Create and export the React Query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Export the React Query utils
export { useQuery, useMutation } from '@tanstack/react-query';