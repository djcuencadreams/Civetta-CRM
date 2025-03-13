/**
 * Direct targeted fix for Vite's runtime error plugin - AGGRESSIVE VERSION
 * 
 * This module completely disables Vite's runtime error overlay for AbortError
 * specifically targeting "signal is aborted without reason" errors that appear during HMR
 */

// Flag to ensure we only patch once
let patched = false;

/**
 * Apply a focused patch to the Vite runtime error plugin
 * This aggressively prevents AbortController errors from showing in the overlay,
 * while still allowing genuine errors to be displayed
 */
export function applyViteErrorPluginFix(): void {
  // Skip if already patched or not in development
  if (patched || typeof window === 'undefined') return;

  console.debug('Applying targeted Runtime Error Plugin fix');
  
  // APPROACH 1: Intercept fetch calls to the error overlay
  // Keep the original fetch implementation
  const originalFetch = window.fetch;
  
  // Replace with our version that blocks abort-related error reporting
  window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Get the URL as a string
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);
    
    // Only intercept Vite error overlay requests
    if (url.includes('__vite_error_overlay') || url.includes('@vite/client')) {
      // Block requests with aborted signals
      if (init?.signal?.aborted) {
        console.debug('Blocked Vite error overlay fetch for aborted signal');
        // Return empty successful response instead of throwing
        return Promise.resolve(new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // For other overlay requests, pass through but check the response
      return originalFetch(input, init).then(response => {
        // Clone the response so we can read it and still return the original
        return response.clone().text().then(text => {
          // Check if this is an abort error
          if (text.includes('signal is aborted') || 
              text.includes('AbortError') || 
              text.includes('operation was aborted')) {
            console.debug('Intercepted abort error in Vite error overlay response');
            // Return empty response instead
            return new Response(JSON.stringify({}), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return response;
        }).catch(() => response); // On error reading response, return original
      });
    }
    
    // For all other requests, use original fetch behavior
    return originalFetch(input, init);
  };

  // APPROACH 2: Intercept error events before they reach Vite's error handler
  // Capture the original error handlers
  const originalWindowErrorHandler = window.onerror;
  const originalUnhandledRejection = window.onunhandledrejection;
  
  // Patch window.onerror to block AbortErrors
  window.onerror = function(
    message: string | Event, 
    source?: string, 
    lineno?: number, 
    colno?: number, 
    error?: Error
  ): boolean {
    // Check if this is an abort error
    if (error && (
        error.name === 'AbortError' || 
        (typeof message === 'string' && message.includes('signal is aborted'))
    )) {
      console.debug('Intercepted AbortError in window.onerror:', message);
      return true; // Prevents the error from propagating
    }
    
    // For other errors, call the original handler
    if (typeof originalWindowErrorHandler === 'function') {
      // TypeScript safe call using the same parameters
      return originalWindowErrorHandler(message, source, lineno, colno, error);
    }
    
    return false; // Default return if no handler exists
  };
  
  // Instead of replacing onunhandledrejection handler, add an event listener
  // This avoids TypeScript issues with the handler's 'this' context
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason;
    
    // Check if this is an abort error
    if (error && (
        error.name === 'AbortError' || 
        (error.message && typeof error.message === 'string' && error.message.includes('signal is aborted'))
    )) {
      console.debug('Filtered unhandled promise rejection (abort):', error.message);
      event.preventDefault();
      return false; // Prevents the error from propagating
    }
    
    // Let other errors propagate to the original handler
    return true;
  }, true); // Use capture phase to intercept before default handler

  // APPROACH 3: Use MutationObserver to remove error overlays from the DOM
  // Create a style element for CSS-based blocking of error overlays
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Hide all abort-related Vite error overlays */
    div[data-vite-error-overlay]:has(pre:contains("signal is aborted")),
    div[data-vite-error-overlay]:has(pre:contains("AbortError")),
    div[data-vite-error-overlay]:has(pre:contains("operation was aborted")),
    div[data-vite-devtools] > div > div:has(pre:contains("signal is aborted")) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
    }
  `;
  document.head.appendChild(styleEl);
  
  // Use MutationObserver to catch and remove error overlays as they appear
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          
          // Check for Vite error overlay elements
          const isOverlay = (
            node.hasAttribute('data-vite-error-overlay') ||
            (node instanceof HTMLDivElement && 
             node.style.position === 'fixed' && 
             node.style.zIndex === '99999')
          );
          
          if (isOverlay) {
            // Check overlay content for abort errors
            const content = node.textContent || '';
            const isAbortError = (
              content.includes('signal is aborted') ||
              content.includes('AbortError') ||
              content.includes('operation was aborted')
            );
            
            if (isAbortError) {
              console.debug('Removing Vite abort error overlay from DOM:', {
                errorMessage: content.slice(0, 100) + '...',
                timestamp: new Date().toISOString()
              });
              
              // First hide, then remove the node
              node.style.display = 'none';
              setTimeout(() => {
                if (node.parentNode) {
                  node.parentNode.removeChild(node);
                }
              }, 0);
            }
          }
        });
      }
    }
  });
  
  // Start observing the DOM for changes
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // APPROACH 4: Directly attempt to monkey-patch Vite's internal error module
  setTimeout(() => {
    try {
      // Look for Vite's error handler object on the window
      const win = window as any;
      for (const key in win) {
        // Check if this looks like Vite's error handler
        const obj = win[key];
        if (obj && typeof obj === 'object' && obj.onError && typeof obj.onError === 'function') {
          // Create a backup of the original onError function
          const originalOnError = obj.onError;
          
          // Replace with our filtered version
          obj.onError = function(error: any) {
            // Skip abort errors
            if (error && (
                error.name === 'AbortError' || 
                (error.message && typeof error.message === 'string' && 
                 error.message.includes('signal is aborted'))
            )) {
              console.debug('Blocked error from reaching Vite error handler:', error.message);
              return null; // Return null instead of showing the error
            }
            
            // Pass through all other errors - using direct call instead of apply
            return originalOnError(error);
          };
          
          console.debug('Successfully patched Vite error handler object');
        }
      }
    } catch (err) {
      console.debug('Could not directly patch Vite error handler, using fallback methods');
    }
  }, 500);

  console.debug('Applied all abort error handling patches - this should fix the runtime error plugin');
  
  // Mark as patched
  patched = true;
}

// Auto-apply when imported
applyViteErrorPluginFix();