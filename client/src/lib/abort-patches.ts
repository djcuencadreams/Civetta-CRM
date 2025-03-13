/**
 * This file contains patches for AbortController and fetch API
 * to properly handle abort errors instead of suppressing them
 */

import { abortReasons } from './abort-helpers';

// Map to store abort reasons for debugging
export function createTrackedAbortController(reason: string = 'Request aborted') {
  const controller = new AbortController();
  abortReasons.set(controller.signal, reason);
  if (typeof window !== 'undefined') {
    (window as any).__activeAbortControllers = (window as any).__activeAbortControllers || new Set();
    (window as any).__activeAbortControllers.add(controller);
  }
  return controller;
}

// No longer patching AbortController or fetch API
// Instead, expose the helper function
export { createTrackedAbortController };

// Set up global error handlers for AbortError
if (typeof window !== 'undefined') {
  // Simple unhandled rejection handler focused only on AbortErrors
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    if (error && error.name === 'AbortError') {
      console.debug('Fetch request aborted:', error);
      event.preventDefault();
    }
  });
}