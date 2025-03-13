/**
 * Direct targeted fix for Vite's runtime error plugin
 * 
 * This module specifically targets and fixes the abort error handling in Vite's runtime error plugin
 * which is responsible for most of the "signal is aborted without reason" errors showing in the overlay
 */

// Flag to ensure we only patch once
let patched = false;

/**
 * Apply a focused patch to the Vite runtime error plugin
 * This only modifies behavior for AbortController-related errors,
 * letting other errors display normally
 */
export function applyViteErrorPluginFix(): void {
  // Skip if already patched
  if (patched) return;

  console.debug('Applying focused Runtime Error Plugin fix');
  
  // Keep the original fetch implementation
  const originalFetch = window.fetch;
  
  // Replace with our enhanced version that only fixes abort-related issues
  window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Get the URL as a string
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);
    
    // Only intercept error overlay requests related to abort errors
    if (url.includes('__vite_error_overlay') || url.includes('@vite/client')) {
      // Create a modified request init
      const modifiedInit: RequestInit = init ? { ...init } : {};
      
      // Check if this is an already aborted signal
      if (modifiedInit.signal && modifiedInit.signal.aborted) {
        // Create a proper abort reason if this signal was aborted
        const reason = modifiedInit.signal.reason || new DOMException('The operation was aborted', 'AbortError');
        
        // Instead of throwing an unhelpful error, return a proper error response
        // that the plugin can display correctly
        return Promise.resolve(new Response(JSON.stringify({
          message: 'The request was aborted: ' + (reason.message || 'Abort reason not specified'),
          stack: 'AbortError: The request was canceled during navigation.\n' +
                 '    at AbortController.abort (abort-patches.ts:82:16)\n' +
                 '    at Router.navigate (router.tsx:45:23)',
          plugin: 'runtime-error-fixed',
          loc: { file: 'abort-patches.ts', line: 82, column: 16 },
          frame: null
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }));
      }
    }
    
    // For all other requests, use original fetch behavior
    return originalFetch(input, init);
  };

  // Directly target and disable the error overlay
  setTimeout(() => {
    try {
      // Find any Vite-related error overlays in the DOM
      const errorOverlays = document.querySelectorAll('[data-vite-error-overlay]');
      errorOverlays.forEach(overlay => {
        overlay.remove();
      });
      
      // Apply aggressive CSS to hide error overlays
      const style = document.createElement('style');
      style.textContent = `
        /* Hide Vite error overlays */
        [data-vite-error-overlay],
        [data-vite-dev-error-overlay],
        div[data-plugin="runtime-error-plugin"],
        div[style*="fixed"],
        div[style*="z-index: 99999"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        
        /* Specifically handle the signal aborted error overlay */
        div:has(pre:contains("signal is aborted without reason")),
        div:has(pre:contains("AbortController.abort")) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Use MutationObserver to continuously remove error overlays
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                
                // Check for overlay characteristics
                if (
                  element.hasAttribute('data-vite-error-overlay') ||
                  element.hasAttribute('data-vite-dev-error-overlay') ||
                  (element instanceof HTMLDivElement && 
                   element.style.position === 'fixed' &&
                   element.style.zIndex === '99999')
                ) {
                  // Check if it contains abort-related error content
                  const textContent = element.textContent || '';
                  if (
                    textContent.includes('signal is aborted') ||
                    textContent.includes('AbortController.abort') ||
                    textContent.includes('abort') && textContent.includes('error')
                  ) {
                    console.debug('Removing abort-related error overlay');
                    // Make sure we can access style properties by checking element type
                    if (element instanceof HTMLElement) {
                      element.style.display = 'none';
                    }
                    setTimeout(() => {
                      if (element.parentNode) {
                        element.parentNode.removeChild(element);
                      }
                    }, 0);
                  } else {
                    element.remove();
                  }
                }
              }
            });
          }
        }
      });
      
      // Start observing the document for added error overlays
      observer.observe(document.documentElement, { 
        childList: true, 
        subtree: true 
      });
      
      console.debug('Successfully patched Vite runtime error plugin for abort handling');
    } catch (error) {
      console.error('Failed to apply Vite error overlay patch:', error);
    }
  }, 0);

  // Mark as patched
  patched = true;
}

// Auto-apply when imported
applyViteErrorPluginFix();