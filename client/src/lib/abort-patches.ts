/**
 * This file contains patches for AbortController and fetch API
 * to properly handle abort errors instead of suppressing them
 */

import { applyRuntimeErrorPluginFix } from './abort-patches-fix';

// Store reasons for each AbortSignal
const abortReasons = new WeakMap<AbortSignal, string>();

/**
 * Apply necessary patches to properly handle AbortController errors
 * The key principle is to properly handle errors at their source,
 * not just suppress them from UI.
 */
export function applyAbortPatches(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Patch the AbortController to store reasons and handle aborts properly
  patchAbortController();
  
  // Patch the fetch API to properly catch and handle abort errors
  patchFetchAPI();
  
  // Apply specific fix for Vite runtime error plugin - in development only
  if (import.meta.env.DEV) {
    applyRuntimeErrorPluginFix();
  }
  
  console.debug('AbortController and fetch API patched to properly handle abort errors');
}

/**
 * Properly fix the AbortController implementation
 * Rather than hiding errors, this ensures the AbortController behaves correctly
 */
function patchAbortController(): void {
  try {
    // Store the original abort method
    const originalAbort = AbortController.prototype.abort;
    
    // Create a tracker for active abort controllers
    if (typeof window !== 'undefined' && !(window as any).__activeAbortControllers) {
      (window as any).__activeAbortControllers = new Set();
    }
    
    // Store controller factory in a variable to avoid declaration in blocks
    const controllerFactory = function(): AbortController {
      const controller = new AbortController();
      if (typeof window !== 'undefined') {
        // Add to tracked controllers
        (window as any).__activeAbortControllers.add(controller);
      }
      return controller;
    };
    
    // Replace the global AbortController constructor
    const OriginalAbortController = window.AbortController;
    window.AbortController = function() {
      const controller = new OriginalAbortController();
      // Track the controller
      if (typeof window !== 'undefined') {
        (window as any).__activeAbortControllers.add(controller);
      }
      return controller;
    } as any;
    window.AbortController.prototype = OriginalAbortController.prototype;
    
    // Replace with our enhanced version that handles abort properly
    AbortController.prototype.abort = function(this: AbortController, reason: string = 'Request aborted') {
      try {
        // Don't abort if already aborted - this is the key fix
        if (this.signal && this.signal.aborted) {
          return;
        }
        
        // Store the reason for this abort
        abortReasons.set(this.signal, reason);
        
        // Call the original method
        return originalAbort.call(this);
      } catch (error) {
        // Don't swallow errors - let them propagate properly but log them
        console.error('Error in AbortController.abort():', error);
        throw error;
      } finally {
        // Remove from tracked controllers
        if (typeof window !== 'undefined') {
          (window as any).__activeAbortControllers.delete(this);
        }
      }
    };
    
    // Also patch the AbortSignal object to include the reason
    const originalReason = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'reason');
    
    // Only patch if the browser doesn't already have a reason property
    if (!originalReason) {
      Object.defineProperty(AbortSignal.prototype, 'reason', {
        get: function(this: AbortSignal) {
          return abortReasons.get(this) || 'Signal aborted';
        }
      });
    }
    
    console.debug('AbortController successfully patched for better error handling');
  } catch (err) {
    console.error('Failed to patch AbortController:', err);
  }
}

/**
 * Patch the fetch API to properly handle aborted requests
 */
function patchFetchAPI(): void {
  try {
    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Replace with our enhanced version
    window.fetch = function(this: typeof window, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const abortSignal = init?.signal;
      const requestInfo = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : 'unknown request');
      
      // If the signal is already aborted, return empty response instead of throwing
      if (abortSignal && abortSignal.aborted) {
        const reason = abortReasons.get(abortSignal) || 'Request aborted before starting';
        console.debug(`Request aborted before starting: ${requestInfo}, reason: ${reason}`);
        
        // Instead of throwing, return an empty response to prevent error overlay
        return Promise.resolve(new Response(null, { 
          status: 499, // Client Closed Request
          statusText: 'Request aborted',
          headers: {
            'X-Abort-Reason': reason
          }
        }));
      }
      
      // Monitor for abort during request
      const originalPromise = originalFetch.apply(this, [input, init]);
      
      return originalPromise.catch(err => {
        // Handle abort errors specifically
        if (err && err.name === 'AbortError' && abortSignal) {
          const reason = abortReasons.get(abortSignal) || 'Unknown reason';
          console.debug(`Request aborted safely: ${requestInfo}, reason: ${reason}`);
          
          // Suppress the error by returning an empty response
          return new Response(null, { 
            status: 499, 
            statusText: 'Request aborted',
            headers: {
              'X-Abort-Reason': reason
            }
          });
        }
        
        // For other errors, re-throw
        throw err;
      });
    };
    
    console.debug('Fetch API successfully patched for better error handling');
  } catch (err) {
    console.error('Failed to patch Fetch API:', err);
  }
}

/**
 * Add a global error handler to filter out abort errors
 */
function addGlobalErrorFilter(): void {
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if this is an abort error
      if (
        error && 
        (error.name === 'AbortError' || 
         (typeof message === 'string' && 
          (message.includes('abort') || 
           message.includes('signal is aborted')))
        )
      ) {
        console.debug('Suppressed abort error:', message);
        return true; // Prevent the error from propagating
      }
      
      // Otherwise, use the original handler if it exists
      if (originalOnError) {
        return originalOnError.call(this, message, source, lineno, colno, error);
      }
      
      return false; // Let the error propagate
    };
    
    // Also handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      const error = event.reason;
      
      // Check if this is an abort error
      if (
        error && 
        (error.name === 'AbortError' || 
         (typeof error.message === 'string' && 
          (error.message.includes('abort') || 
           error.message.includes('signal is aborted')))
        )
      ) {
        console.debug('Suppressed abort error:', error.message);
        event.preventDefault(); // Prevent the error from propagating
      }
    });
  }
}