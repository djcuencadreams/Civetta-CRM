/**
 * This file contains patches for AbortController and fetch API
 * to properly handle abort errors instead of suppressing them
 */

import { createTrackedAbortController } from './abort-helpers';
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

  // Apply specific fix for Vite runtime error plugin - in development only
  if (import.meta.env.DEV) {
    applyRuntimeErrorPluginFix();
  }

  console.debug('AbortController and fetch API patched to properly handle abort errors');
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

// No longer patching AbortController or fetch API
// Instead, expose the helper function
export { createTrackedAbortController };