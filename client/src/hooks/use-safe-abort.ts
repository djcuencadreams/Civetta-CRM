/**
 * Safe Abort Controller Hook
 * 
 * This hook provides an AbortController that is properly configured for safe error handling,
 * and automatically aborts when the component unmounts. It's used to prevent unhandled promise
 * rejections from AbortErrors during component cleanup.
 */
import { useEffect, useState, useRef } from 'react';
import { createSafeAbortController } from '@/lib/queryClient';

/**
 * React hook that provides a safe AbortController with proper cleanup
 * 
 * @param reason Optional text description of why this controller might abort
 * @returns AbortController object with signal property for fetch requests
 */
export function useSafeAbort(reason = 'Component unmounted'): AbortController {
  // Use a ref to keep the controller instance stable across renders
  const controllerRef = useRef<AbortController | null>(null);
  
  // Create a new controller only on first render
  if (controllerRef.current === null) {
    controllerRef.current = createSafeAbortController(reason);
  }
  
  // Abort the controller on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current && !controllerRef.current.signal.aborted) {
        controllerRef.current.abort(reason);
      }
    };
  }, [reason]);
  
  return controllerRef.current;
}

/**
 * Hook that returns a signal for fetch requests and abort function, with automatic cleanup
 * on component unmount
 * 
 * @param reason Optional text description of why this controller might abort
 * @returns Object containing signal and abort function
 */
export function useSafeSignal(reason = 'Component unmounted'): { signal: AbortSignal; abort: (reason?: string) => void } {
  const controller = useSafeAbort(reason);
  
  // Create a stable abort function that won't change between renders
  const abortRef = useRef<(reason?: string) => void>((abortReason?: string) => {
    if (controller && !controller.signal.aborted) {
      controller.abort(abortReason || reason);
    }
  });
  
  return {
    signal: controller.signal,
    abort: abortRef.current
  };
}

/**
 * Creates a safe fetch wrapper that automatically aborts on component unmount
 * This version properly handles abort errors with custom error classes
 * rather than suppressing them with fake responses
 * 
 * @param reason Optional text description of why this controller might abort
 * @returns A safe fetch function with proper error handling
 */
export function useSafeFetch(reason = 'Component unmounted'): (url: string, options?: RequestInit) => Promise<Response> {
  const controller = useSafeAbort(reason);
  
  // Track mounted state
  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return async (url: string, options: RequestInit = {}) => {
    // Merge our abort signal with any options provided
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    try {
      // Check if already unmounted before making the request
      if (!mountedRef.current) {
        throw new DOMException('Component already unmounted before fetch started', 'AbortError');
      }
      
      // Make the fetch request
      const response = await fetch(url, fetchOptions);
      
      // Check if component was unmounted during the fetch
      if (!mountedRef.current) {
        console.debug(`Component unmounted during fetch to ${url} - response will not be processed`);
        // We still return the response, but the caller should check mountedRef
        // before processing the response data
      }
      
      return response;
    } catch (error) {
      // If it's an abort error and the component is still mounted, log it
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Only log if still mounted (otherwise it's a normal cleanup)
        if (mountedRef.current) {
          console.debug(`Fetch request to ${url} was aborted: ${error.message || reason}`);
        }
        
        // Create a proper error with all necessary information for debugging
        const abortError = new DOMException(
          `Request to ${url} was aborted: ${error.message || reason}`,
          'AbortError'
        );
        
        // Properly throw the error to allow component-level catch handlers to work
        throw abortError;
      }
      
      // Re-throw any other errors
      throw error;
    }
  };
}

export default useSafeAbort;