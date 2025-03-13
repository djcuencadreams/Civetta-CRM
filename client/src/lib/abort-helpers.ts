
/**
 * Helper functions for AbortController that track controllers without overwriting native APIs
 */

// Store reasons for each AbortSignal
const abortReasons = new Map<AbortSignal, string>();

/**
 * Creates an AbortController that is tracked for debugging purposes
 * without overwriting the native AbortController API
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
 * Get the reason for an abort, if available
 */
export function getAbortReason(signal: AbortSignal): string {
  return abortReasons.get(signal) || 'Request aborted';
}

/**
 * Clean up tracked controllers
 */
export function cleanupTrackedControllers() {
  if (typeof window !== 'undefined' && (window as any).__activeAbortControllers) {
    (window as any).__activeAbortControllers.clear();
  }
}
