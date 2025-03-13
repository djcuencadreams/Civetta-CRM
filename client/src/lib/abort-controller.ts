/**
 * Enhanced AbortController utilities
 * Provides better handling for aborting fetch requests with reasons
 */

/**
 * Creates an AbortController with a custom abort reason
 * This helps provide better debugging context when requests are aborted
 * 
 * @param reason The reason for a potential abort
 * @returns Enhanced AbortController instance
 */
export function createAbortController(reason: string = 'Component unmounted'): AbortController {
  const controller = new AbortController();
  
  // Store the original abort method
  const originalAbort = controller.abort;
  
  // Override the abort method to include reason
  controller.abort = function(message?: string) {
    const abortReason = message || reason;
    
    // Create an AbortError with our custom reason
    const error = new DOMException(abortReason, 'AbortError');
    
    // @ts-ignore - Add the reason to the controller signal
    controller.signal.reason = { message: abortReason };
    
    // Call the original abort with our custom error
    return originalAbort.call(this, error);
  };
  
  return controller;
}

/**
 * React hook for managing an AbortController tied to component lifecycle
 * Automatically aborts any ongoing requests when component unmounts
 * 
 * @param reason Optional reason for the abort when component unmounts
 * @returns AbortController that will be aborted on unmount
 */
export function useAbortController(reason: string = 'Component unmounted'): AbortController {
  // Create a ref to store the controller
  const controllerRef = React.useRef<AbortController | null>(null);
  
  // Create a new controller on first render
  if (!controllerRef.current) {
    controllerRef.current = createAbortController(reason);
  }
  
  // Abort the controller when component unmounts
  React.useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort(`Component unmounted: ${reason}`);
        controllerRef.current = null;
      }
    };
  }, [reason]);
  
  return controllerRef.current;
}

// Also import React for the hook
import React from 'react';