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
 * Hook that returns a signal for fetch requests, with automatic cleanup
 * on component unmount
 * 
 * @param reason Optional text description of why this controller might abort
 * @returns AbortSignal object to pass to fetch options
 */
export function useSafeSignal(reason = 'Component unmounted'): AbortSignal {
  return useSafeAbort(reason).signal;
}

/**
 * Creates a safe fetch wrapper that automatically aborts on component unmount
 * 
 * @param reason Optional text description of why this controller might abort
 * @returns A safe fetch function with abort handling
 */
export function useSafeFetch(reason = 'Component unmounted'): (url: string, options?: RequestInit) => Promise<Response> {
  const controller = useSafeAbort(reason);
  
  return async (url: string, options: RequestInit = {}) => {
    // Merge our abort signal with any options provided
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    try {
      return await fetch(url, fetchOptions);
    } catch (error) {
      // If it's an abort error, we suppress it by returning a minimal response
      // This prevents runtime errors during component unmount
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.debug(`Fetch request to ${url} was aborted due to: ${reason}`);
        
        // Instead of throwing, return an empty response object that's safe to destructure
        const emptyResponse = new Response(JSON.stringify({ aborted: true }), {
          status: 499, // Unofficial "Client Closed Request" status
          statusText: 'Request aborted',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        return emptyResponse;
      }
      
      // Re-throw any other errors
      throw error;
    }
  };
}

export default useSafeAbort;