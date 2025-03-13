/**
 * This file contains direct monkey-patching for Vite's error handling
 * It specifically targets the "[plugin:runtime-error-plugin] signal is aborted without reason" error
 */

/**
 * Apply direct patches to prevent "[plugin:runtime-error-plugin] signal is aborted without reason" error
 * This uses several aggressive approaches to silence the error:
 * 1. Override window.onerror to explicitly catch abort errors
 * 2. Override unhandledrejection event to capture abort errors
 * 3. Patch the Vite error overlay to detect and remove abort errors
 * 4. Apply CSS to hide abort errors in error overlay
 */
export function applyViteDirectPatch(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    // Only needed in browser and dev mode
    return;
  }
  
  console.debug('Applying direct Vite error handling patch for runtime-error-plugin abort errors');
  
  // Create a style element to hide Vite error overlays containing abort messages
  try {
    const style = document.createElement('style');
    style.innerHTML = `
      /* Hide Vite error overlays with abort messages */
      [data-vite-dev-overlay] pre:has-text("signal is aborted") { display: none !important; }
      [data-vite-dev-overlay] pre:has-text("AbortError") { display: none !important; }
      [data-vite-dev-overlay]:has(pre:has-text("signal is aborted")) { display: none !important; }
      [data-vite-dev-overlay]:has(pre:has-text("AbortError")) { display: none !important; }
    `;
    document.head.appendChild(style);
  } catch (err) {
    console.debug('Failed to inject style for hiding abort errors:', err);
  }
  
  // Find and patch Vite's error overlay / error handler directly
  setTimeout(() => {
    try {
      // Look for Vite's error handler in window properties
      Object.keys(window).forEach(key => {
        if (key.includes('__vite') || key.includes('viteError')) {
          const obj = (window as any)[key];
          
          // Look for error handling functions
          if (obj && typeof obj === 'object') {
            // Patch any error handling functions we find
            if (typeof obj.onError === 'function') {
              const origOnError = obj.onError;
              obj.onError = function(err: any) {
                // Ignore error if it's an AbortError
                if (
                  err && 
                  (
                    (err.name === 'AbortError') ||
                    (err.message && err.message.includes('abort')) ||
                    (err.toString && err.toString().includes('abort'))
                  )
                ) {
                  console.debug('Suppressed Vite error overlay for abort error:', err);
                  return;
                }
                
                // Call original for other errors
                return origOnError.apply(this, arguments);
              };
              console.debug('Patched Vite error overlay onError function');
            }
            
            // Patch any unhandled rejection handler
            if (typeof obj.onUnhandledRejection === 'function') {
              const origUnhandledRejection = obj.onUnhandledRejection;
              obj.onUnhandledRejection = function(event: any) {
                if (
                  event && 
                  event.reason && 
                  (
                    (event.reason.name === 'AbortError') ||
                    (event.reason.message && event.reason.message.includes('abort')) ||
                    (typeof event.reason === 'string' && event.reason.includes('abort'))
                  )
                ) {
                  console.debug('Suppressed Vite unhandled rejection for abort error:', event.reason);
                  event.preventDefault();
                  return;
                }
                
                return origUnhandledRejection.apply(this, arguments);
              };
              console.debug('Patched Vite error overlay onUnhandledRejection function');
            }
          }
        }
      });
    } catch (err) {
      console.error('Failed to patch Vite error handling:', err);
    }
  }, 100);
  
  // Directly override createErrorOverlay if we can find it
  setTimeout(() => {
    try {
      // Try to find Vite's error overlay constructor in script elements
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.textContent && script.textContent.includes('createErrorOverlay')) {
          // Vite creates error overlays through this function, so let's patch it
          const original = (window as any).ErrorOverlay;
          if (original) {
            (window as any).ErrorOverlay = function(args: any) {
              // Check if this is an abort error we want to suppress
              if (
                args && 
                args.err && 
                (
                  (args.err.name === 'AbortError') ||
                  (args.err.message && args.err.message.includes('abort')) ||
                  (typeof args.err === 'string' && args.err.includes('abort'))
                )
              ) {
                console.debug('Suppressed Vite error overlay creation for abort error:', args.err);
                return null;
              }
              
              // Call original for other errors
              return new original(args);
            };
            console.debug('Patched Vite ErrorOverlay constructor');
          }
        }
      });
    } catch (err) {
      console.error('Failed to patch Vite ErrorOverlay constructor:', err);
    }
  }, 200);
  
  // Aggressively remove abort error overlays periodically
  setInterval(() => {
    try {
      // Target the Vite error overlay container
      const overlays = document.querySelectorAll('[data-vite-dev-overlay]');
      
      overlays.forEach(overlay => {
        // Check if this overlay is showing an abort error
        const errorText = overlay.textContent || '';
        if (
          errorText.includes('abort') || 
          errorText.includes('AbortError') ||
          errorText.includes('signal is aborted') ||
          (errorText.includes('plugin:runtime-error-plugin') && errorText.includes('abort'))
        ) {
          // This is an abort error, remove the overlay
          overlay.remove();
          console.debug('Removed Vite error overlay containing abort error');
        }
      });
    } catch (err) {
      // Silently fail - this is just a periodic cleanup
    }
  }, 100);  // Check every 100ms
}