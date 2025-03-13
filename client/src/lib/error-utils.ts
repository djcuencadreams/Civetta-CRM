/**
 * Utility functions for error handling, particularly focused on
 * managing abort signals gracefully
 */

/**
 * Checks if an error is from an aborted fetch request
 * @param error The error to check
 * @returns True if the error is from an aborted request
 */
export function isAbortError(error: any): boolean {
  return error && error.name === 'AbortError';
}

/**
 * Wraps a fetch call to handle abort errors gracefully
 * @param fetchPromise A promise returned from fetch
 * @param options Options for handling the fetch
 * @returns The fetch promise with abort handling
 */
export async function handleFetchWithAbort<T>(
  fetchPromise: Promise<Response>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onAbort?: () => void;
  } = {}
): Promise<T | null> {
  try {
    const response = await fetchPromise;
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'API request failed');
    }
    
    const data = await response.json() as T;
    options.onSuccess?.(data);
    return data;
  } catch (error) {
    if (isAbortError(error)) {
      // Handle abort errors gracefully
      console.log('Request was cancelled', error);
      options.onAbort?.();
      return null;
    }
    
    // Handle other errors
    console.error('Fetch error:', error);
    if (options.onError && error instanceof Error) {
      options.onError(error);
    }
    throw error;
  }
}

/**
 * Creates an AbortController with automatic cleanup
 * @param timeoutMs Optional timeout in milliseconds after which to abort
 * @returns The AbortController instance
 */
export function createSafeAbortController(timeoutMs?: number): AbortController {
  const controller = new AbortController();
  
  if (timeoutMs) {
    setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, timeoutMs);
  }
  
  return controller;
}