
/**
 * Helper functions for properly handling AbortController
 * without modifying browser APIs
 */

// Store reasons for each AbortSignal
export const abortReasons = new WeakMap<AbortSignal, string>();

/**
 * Creates a tracked AbortController with an associated reason
 * This is a safer alternative to overwriting window.AbortController
 */
export function createTrackedAbortController(reason: string = 'Request aborted') {
  const controller = new AbortController();
  abortReasons.set(controller.signal, reason);
  if (typeof window !== 'undefined') {
    (window as any).__activeAbortControllers = (window as any).__activeAbortControllers || new Set();
    (window as any).__activeAbortControllers.add(controller);
  }
  return controller;
}

/**
 * Get the reason associated with an AbortSignal if any
 */
export function getAbortReason(signal: AbortSignal): string {
  return abortReasons.get(signal) || 'Request aborted';
}

/**
 * Safely abort a controller with logging
 */
export function safelyAbortController(controller: AbortController, reason?: string): void {
  if (!controller.signal.aborted) {
    if (reason) {
      abortReasons.set(controller.signal, reason);
    }
    controller.abort();
  }
}
