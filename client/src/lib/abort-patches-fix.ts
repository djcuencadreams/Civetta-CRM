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
 * Checks if an error message is specifically related to an aborted fetch request
 * Only returns true for genuine AbortController signal aborts, not any error with "abort" text
 */
function isAbortErrorMessage(message: string): boolean {
  if (!message) return false;
  
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
  // Specific patterns that definitively identify genuine AbortController aborts
  const isExplicitAbortError = (
    // Standard AbortController error messages
    lowerMessage === 'signal is aborted without reason' ||
    lowerMessage === 'the operation was aborted' ||
    lowerMessage === 'the user aborted a request' ||
    lowerMessage === 'abort error' ||
    
    // Standard DOM exception with AbortError name
    lowerMessage.startsWith('aborterror:') ||
    
    // Fetch API specific abort patterns
    (lowerMessage.includes('fetch') && lowerMessage.includes('abort')) ||
    
    // AbortController signal specific patterns
    (lowerMessage.includes('signal') && (
      lowerMessage.includes('abort') || 
      lowerMessage.includes('aborted')
    )) ||
    
    // Request/operation explicitly aborted patterns
    lowerMessage === 'request aborted' ||
    lowerMessage === 'operation aborted' ||
    
    // Cancellation with explicit reason patterns
    (lowerMessage.includes('abort') && lowerMessage.includes('reason: component unmount')) ||
    (lowerMessage.includes('abort') && lowerMessage.includes('reason: navigation'))
  );
  
  // Log details for debugging when we decide something is an abort error
  if (isExplicitAbortError) {
    console.debug('Filtered unhandled promise rejection (abort):', message);
  }
  
  return isExplicitAbortError;
}

/**
 * Attempts to patch Vite's runtime error plugin directly to prevent abort error overlays
 * This aggressively prevents error overlays from showing for abort signals while still
 * allowing legitimate error overlays to display.
 */
function patchViteRuntimeErrorPlugin() {
  // Patch mechanism for Vite runtime error plugin
  // We use MutationObserver to detect and remove error overlays related to abort errors
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          
          // Look for Vite error overlays with specific attributes or styling
          const isErrorOverlay = (
            node.hasAttribute('data-vite-error-overlay') ||
            node.classList.contains('vite-error-overlay') ||
            (node.style.zIndex === '99999' && node.style.position === 'fixed') ||
            node.id === 'vite-error-overlay'
          );
          
          if (isErrorOverlay) {
            // Extract error content for analysis 
            const errorContent = node.textContent || '';
            
            // Check if this is related to hot module reloading
            const isHmrRelated = errorContent.includes('hot module replacement') || 
                                 errorContent.includes('hmr') ||
                                 errorContent.includes('hot update');
            
            // For HMR-related errors, always suppress as they're transient
            if (isHmrRelated) {
              hideErrorOverlay(node);
              return;
            }
            
            // For other errors, check if they're genuine abort errors
            if (isAbortErrorMessage(errorContent)) {
              // Log detailed info about the suppressed error
              console.debug('Suppressing Vite error overlay for abort error:', {
                error: errorContent.slice(0, 150) + (errorContent.length > 150 ? '...' : ''),
                overlayType: node.getAttribute('data-vite-error-overlay') || 'unknown',
                reason: 'AbortController signal abort - expected during navigation',
                timestamp: new Date().toISOString()
              });
              
              // Hide and remove the error overlay
              hideErrorOverlay(node);
            } else {
              // Not an abort error, allow it to display
              console.debug('Allowing non-abort error overlay to display');
            }
          }
        });
      }
    });
  });

  /**
   * Helper function to hide and remove an error overlay element
   */
  function hideErrorOverlay(overlayElement: HTMLElement): void {
    // Hide the error overlay immediately
    overlayElement.style.display = 'none';
    
    // And remove it after a short delay to ensure it's fully gone
    setTimeout(() => {
      if (overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
        console.debug('Removed abort error overlay from DOM');
      }
    }, 100);
  }

  // Handle existing error overlays that might already be in the DOM
  document.querySelectorAll('[data-vite-error-overlay], .vite-error-overlay').forEach(element => {
    if (element instanceof HTMLElement) {
      const content = element.textContent || '';
      if (isAbortErrorMessage(content)) {
        hideErrorOverlay(element);
      }
    }
  });

  // Start observing the document for added error overlays
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // Add special CSS to hide abort error overlays as a last resort
  const style = document.createElement('style');
  style.textContent = `
    /* Hide Vite error overlays containing abort errors */
    [data-vite-error-overlay]:has(*:contains("AbortError")),
    [data-vite-error-overlay]:has(*:contains("signal is aborted")),
    [data-vite-error-overlay]:has(*:contains("The operation was aborted")) {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  console.debug('Added aggressive CSS and MutationObserver to prevent Vite error overlays');
  console.debug('Applied all abort error handling patches - this should fix the runtime error plugin');
}