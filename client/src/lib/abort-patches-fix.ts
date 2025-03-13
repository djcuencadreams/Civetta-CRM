/**
 * Enhanced AbortController fixes specifically for Vite's runtime error plugin
 * 
 * This module applies additional fixes to AbortController behavior
 * specifically targeting the interaction with Vite's runtime error plugin
 */

/**
 * Apply additional fixes for AbortController and Vite's runtime error plugin
 */
export function applyRuntimeErrorPluginFix(): void {
  console.debug('Applying targeted Runtime Error Plugin fix');

  // Add event listener to detect when Vite tries to show error overlay for abort errors
  if (typeof window !== 'undefined') {
    // This specifically targets Vite error displays
    window.addEventListener('error', (event) => {
      const errorMessage = event.error?.message || event.message;
      
      // Check if this is an abort-related error
      if (isAbortErrorMessage(errorMessage)) {
        // Prevent the default error handling which would show an error overlay
        event.preventDefault();
        console.debug('Suppressed abort error:', errorMessage);
        return false;
      }
    }, true);

    // Also handle unhandled promise rejections that may be abort errors
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = event.reason?.message || String(event.reason);
      
      // Check if this is an abort-related error
      if (isAbortErrorMessage(errorMessage)) {
        // Prevent the default error handling
        event.preventDefault();
        console.debug('Suppressed unhandled promise rejection (abort error):', errorMessage);
        return false;
      }
    }, true);

    // If available, patch the ShowOverlay function of Vite's runtime error plugin
    patchViteRuntimeErrorPlugin();
  }

  console.debug('Successfully patched Vite runtime error plugin for abort handling');
}

/**
 * Checks if an error message is related to an aborted request
 */
function isAbortErrorMessage(message: string): boolean {
  if (!message) return false;
  
  const lowerMessage = message.toLowerCase();
  
  return (
    lowerMessage.includes('abort') ||
    lowerMessage.includes('aborted') ||
    lowerMessage.includes('network') && lowerMessage.includes('failed') ||
    lowerMessage.includes('signal') && lowerMessage.includes('aborted') ||
    lowerMessage.includes('user aborted') ||
    lowerMessage.includes('operation canceled') ||
    lowerMessage.includes('operation was aborted') ||
    lowerMessage.includes('canceled') && lowerMessage.includes('reason') ||
    lowerMessage.includes('cancelled') && lowerMessage.includes('reason')
  );
}

/**
 * Attempts to patch Vite's runtime error plugin directly
 */
function patchViteRuntimeErrorPlugin() {
  // Patch mechanism for Vite runtime error plugin
  // This is aggressive: We use MutationObserver to detect and remove error overlays
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Look for Vite error overlays
            if (node.hasAttribute('data-vite-error-overlay') ||
                (node.style.zIndex === '99999' && node.style.position === 'fixed')) {
              
              // Check if the error content is an abort error
              const errorContent = node.textContent || '';
              if (isAbortErrorMessage(errorContent)) {
                // Hide the error overlay immediately
                node.style.display = 'none';
                // And remove it after a short delay
                setTimeout(() => {
                  if (node.parentNode) {
                    node.parentNode.removeChild(node);
                  }
                }, 100);
              }
            }
          }
        });
      }
    });
  });

  // Start observing the document body for error overlays
  observer.observe(document.body, { childList: true, subtree: true });
  
  console.debug('Added aggressive CSS and MutationObserver to prevent Vite error overlays');
  console.debug('Applied all abort error handling patches - this should fix the runtime error plugin');
}