/**
 * Special module to override Vite's runtime error plugin behavior
 * This module identifies and patches Vite's error handling to specifically
 * stop the "[plugin:runtime-error-plugin] signal is aborted without reason" errors
 */

/**
 * We need to find and patch the Vite runtime error handling
 * This is a bit hacky but necessary to prevent the plugin from showing
 * AbortError messages which are expected during normal React navigation
 */
export function applyVitePluginOverride(): void {
  if (!import.meta.env.DEV) {
    // Only needed in development mode
    return;
  }

  // Check if running in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Give Vite's error overlay a chance to initialize
  setTimeout(() => {
    try {
      // Attempt to find Vite's error handlers in the window object
      patchViteErrorOverlay();

      // Let the user know we've patched Vite's error handling
      console.debug('Successfully patched Vite runtime error plugin for abort handling');
    } catch (err) {
      console.error('Failed to patch Vite runtime error plugin:', err);
    }
  }, 500);
}

/**
 * Locate and patch Vite's error overlay handlers
 */
function patchViteErrorOverlay(): void {
  // Most reliable way to identify when an error should be ignored by Vite
  // is to patch window.onerror and window.onunhandledrejection
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;

  // If we find Vite's error overlay on the window, try to disable it directly
  const viteErrorOverlay = findViteErrorOverlay();
  if (viteErrorOverlay) {
    patchViteErrorOverlayDirectly(viteErrorOverlay);
  }

  // Patch window.onerror
  window.onerror = function(
    message: Event | string, 
    source?: string, 
    lineno?: number, 
    colno?: number, 
    error?: Error
  ): boolean {
    // Detect if this is an abort error (many variations exist)
    if (isAbortError(error) || isAbortError(message)) {
      console.debug('Intercepted abort error in window.onerror:', 
        typeof message === 'string' ? message : 'AbortError');
      return true; // Prevent further handling
    }

    // Call original handler
    if (originalOnError) {
      // Cast this to Window to satisfy TypeScript
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Patch window.onunhandledrejection
  window.onunhandledrejection = function(
    event: PromiseRejectionEvent
  ): void {
    // Check if this is an abort error
    if (isAbortError(event.reason)) {
      console.debug('Intercepted abort error in window.onunhandledrejection:', 
        event.reason?.message || 'AbortError');
      event.preventDefault();
      return;
    }

    // Call original handler
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.call(window, event);
    }
  };
}

/**
 * Try to find Vite's error overlay in the window object
 */
function findViteErrorOverlay(): any {
  // Search the window for Vite's error overlay
  let overlay: any = null;

  // Look for known properties that might indicate Vite's error overlay
  if ((window as any).__vite_plugin_react_preamble_installed__) {
    // React plugin is installed, good sign
    Object.keys(window).forEach((key) => {
      if (
        key.includes('vite') || 
        key.includes('error') || 
        key.includes('overlay')
      ) {
        const obj = (window as any)[key];
        if (obj && typeof obj === 'object' && obj.hasOwnProperty('onError')) {
          overlay = obj;
        }
      }
    });
  }

  return overlay;
}

/**
 * Attempt to patch Vite's error overlay directly
 */
function patchViteErrorOverlayDirectly(overlay: any): void {
  if (!overlay) return;

  // Store original handlers
  const originalOnError = overlay.onError;
  const originalOnUnhandledRejection = overlay.onUnhandledRejection;

  // Replace with our patched versions
  if (typeof originalOnError === 'function') {
    overlay.onError = function(err: any): void {
      if (isAbortError(err)) {
        console.debug('Prevented Vite error overlay for AbortError:', 
          err?.message || 'AbortError');
        return;
      }
      originalOnError.call(this, err);
    };
  }

  if (typeof originalOnUnhandledRejection === 'function') {
    overlay.onUnhandledRejection = function(event: any): void {
      if (isAbortError(event.reason)) {
        console.debug('Prevented Vite error overlay for unhandled AbortError:', 
          event.reason?.message || 'AbortError');
        event.preventDefault();
        return;
      }
      originalOnUnhandledRejection.call(this, event);
    };
  }
}

/**
 * Comprehensive check for abort errors in any form
 */
function isAbortError(error: any): boolean {
  if (!error) return false;

  // Check for error name
  if (error.name === 'AbortError') return true;

  // Check for DOMException type
  if (error instanceof DOMException && error.name === 'AbortError') return true;

  // Check message content
  if (typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('abort') || 
      msg.includes('aborted') || 
      msg.includes('signal is aborted')
    ) {
      return true;
    }
  }

  // Check for type property (sometimes set)
  if (error.type === 'aborted') return true;

  // Check for code (DOMException AbortError code is 20)
  if (error.code === 20) return true;

  // Check for signal.aborted property
  if (error.signal && error.signal.aborted) return true;

  // String error might be a message about abortion
  if (typeof error === 'string') {
    const errorStr = error.toLowerCase();
    return (
      errorStr.includes('abort') || 
      errorStr.includes('aborted') || 
      errorStr.includes('signal is aborted')
    );
  }

  return false;
}