import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
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
    if (import.meta.env.DEV) {
      console.log(`🔄 [${requestId}] Request: ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log(`Request Body: ${options.body}`);
      }
    }
    
    // For requests with AbortSignal, we'll handle abort errors specially
    const abortSignal = options.signal;
    let abortHandled = false;
    
    // If we have an abort signal, set up our handler
    if (abortSignal) {
      // Check if already aborted (would throw immediately)
      if (abortSignal.aborted) {
        // Get reason from our WeakMap or use default message
        let message = 'Unknown abort reason';
        if (typeof window !== 'undefined' && (window as any).__abortReasonMap) {
          const storedReason = (window as any).__abortReasonMap.get(abortSignal);
          if (storedReason) {
            message = storedReason.message || JSON.stringify(storedReason);
          }
        }
        console.debug(`Request aborted before start: ${options.method || 'GET'} ${url}, reason: ${message}`);
        return {} as T; // Return empty object instead of throwing
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
    if (import.meta.env.DEV) {
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
    if (isAbortError(error)) {
      // Get reason from our WeakMap if available
      let abortReason = 'Component unmount';
      
      // Try to get reason from our WeakMap
      if (options.signal && typeof window !== 'undefined' && (window as any).__abortReasonMap) {
        const storedReason = (window as any).__abortReasonMap.get(options.signal);
        if (storedReason) {
          abortReason = storedReason.message || JSON.stringify(storedReason);
        }
      }
      
      // Don't log abort errors as they are typically intentional and not actual errors
      console.debug(`Request aborted safely: ${options.method || 'GET'} ${url}, reason: ${abortReason}`);
      return {} as T; // Return empty result instead of throwing
    }
    
    // Special handling for "Failed to fetch" errors (which typically mean network issues)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Create a more descriptive error that explains the likely cause
      const networkError = new Error(
        'Network error: Unable to connect to server. ' + 
        'Please check your internet connection and try again.'
      ) as Error & { isNetworkError?: boolean };
      
      // Add custom property to identify this as a network error
      networkError.isNetworkError = true;
      
      // Log with context
      logError(networkError, {
        url,
        method: options.method || 'GET',
        responseTime,
        requestId,
        type: 'network_error',
        originalError: error.message
      });
      
      throw networkError;
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
    
    try {
      // Make the API request with abort signal if provided
      return await api<T>(endpoint, { signal: context.signal });
    } catch (error) {
      // If the error is an AbortError, return an empty result instead of throwing
      // This prevents React Query from showing errors when components unmount
      if (isAbortError(error)) {
        // Get reason from our WeakMap if available
        let abortReason = 'Component unmount';
        
        // Try to get reason from our WeakMap
        if (context.signal && typeof window !== 'undefined' && (window as any).__abortReasonMap) {
          const storedReason = (window as any).__abortReasonMap.get(context.signal);
          if (storedReason) {
            abortReason = storedReason.message || JSON.stringify(storedReason);
          }
        }
        
        console.debug(`Request aborted safely: GET ${endpoint}, reason: ${abortReason}`);
        return {} as T;
      }
      
      // Handle network errors specially so we can show a meaningful message to the user
      if (error instanceof Error && (error as any).isNetworkError) {
        // Let this error propagate up to be handled by our ErrorBoundary
        throw error;
      }
      
      throw error;
    }
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

// Helper to determine if an error is an abort error with enhanced detection
export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  
  // Basic check for standard AbortError
  if (error instanceof Error && 
      (error.name === 'AbortError' || 
       error.message.includes('aborted') || 
       error.message.includes('abort'))) {
    return true;
  }
  
  // Additional check for DOMException type
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  
  // Check for custom properties that might indicate an abort
  if (typeof error === 'object') {
    const errorObj = error as any;
    if (errorObj.type === 'aborted' || 
        errorObj.code === 20 || // DOMException code for AbortError
        (errorObj.cause && isAbortError(errorObj.cause))) {
      return true;
    }
  }
  
  return false;
}

// Create and export the React Query client instance with enhanced error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry for AbortError or 404s
        if (isAbortError(error)) return false;
        if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 404) return false;
        return failureCount < 2; // Only retry twice for other errors
      },
      // Don't refresh on window focus to avoid unnecessary requests
      refetchOnWindowFocus: false,
      // Cache data for 5 minutes (reduces network requests)
      staleTime: 1000 * 60 * 5,
      // Important: adding this flag prevents React Query from throwing
      // when a component unmounts during a query
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      // No retry for mutations - they should be explicitly retried by the user
      retry: false
    }
  },
  // Global query event listeners
  queryCache: new QueryCache({
    onError: (error: unknown, query: any) => {
      if (isAbortError(error)) {
        // Don't log abort errors as they are typically intentional
        console.debug(`Request aborted (expected behavior for ${query.queryKey}), reason: Component unmount or navigation`);
        return;
      }
      
      // Log all other errors with context
      logError(error, { 
        source: 'queryCache',
        queryKey: Array.isArray(query.queryKey) 
          ? query.queryKey.join('/')
          : String(query.queryKey),
        metadata: query.meta
      });
    }
  }),
  // Global mutation event listeners
  mutationCache: new MutationCache({
    onError: (error: unknown, mutation: any) => {
      if (isAbortError(error)) {
        // Don't log abort errors as they are typically intentional
        console.debug(`Mutation aborted (expected behavior), reason: Component unmount or navigation`);
        return;
      }
      
      // Log all other errors with context
      logError(error, { 
        source: 'mutationCache',
        mutationKey: mutation.options?.mutationKey?.toString() || 'unknown',
        variables: mutation.state?.variables 
          ? JSON.stringify(mutation.state.variables).substring(0, 200) 
          : 'none' // Limit string length
      });
    }
  })
});

/**
 * Helper function that safely cancels queries without throwing unhandled errors
 * This is the key fix that prevents the "signal is aborted without reason" errors
 */
export function safeCancelQueries(): void {
  try {
    // We need a proper try/catch to prevent unhandled rejections during cancellation
    queryClient.cancelQueries();
  } catch (error) {
    // If we do get an error, log it but don't let it bubble up
    console.error('Error canceling queries:', error);
  }
}

/**
 * Create a properly configured AbortController that won't throw on abort
 * @param reason Optional reason for the abort
 * @returns Safe abort controller instance
 */
export function createSafeAbortController(reason?: string): AbortController {
  const controller = new AbortController();
  
  // Store reason in a global WeakMap for better error messages
  if (typeof window !== 'undefined') {
    if (!(window as any).__abortReasonMap) {
      (window as any).__abortReasonMap = new WeakMap();
    }
    
    if (reason) {
      (window as any).__abortReasonMap.set(controller.signal, { message: reason });
    }
  }
  
  return controller;
}

// Export the React Query utils
export { useQuery, useMutation } from '@tanstack/react-query';