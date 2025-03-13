/**
 * Unified entry point for all error handling mechanisms
 * This file consolidates all the error handling approaches into a single API
 * that can be easily imported and initialized from App.tsx
 */

// Import all error handling components
import { setupGlobalErrorHandlers, isAbortError, logError } from './global-error-handler';
import { applyAbortPatches } from './abort-patches';
import { applyViteErrorPluginFix } from './runtime-error-plugin-fix';
import { applyRuntimeErrorPluginFix } from './abort-patches-fix';

/**
 * Initialize all error handling systems
 * Call this once at app startup to enable comprehensive error handling
 */
export function initializeErrorHandling(): void {
  console.debug('Initializing comprehensive error handling system...');
  
  // Initialize global error handlers first
  setupGlobalErrorHandlers();
  
  // Apply specific patches
  applyAbortPatches();
  
  // Add proper unhandled rejection handler
  addUnhandledRejectionHandler();
  
  // Apply Vite-specific fixes for development
  if (import.meta.env.DEV) {
    applyViteErrorPluginFix();
    applyRuntimeErrorPluginFix();
    
    // Add CSS suppression for error overlays in dev only
    addCssSuppression();
  }
  
  console.debug('All error handling mechanisms initialized successfully');
}

/**
 * Add a proper handler for unhandled promise rejections
 * This prevents errors from bubbling up to global handlers
 */
function addUnhandledRejectionHandler(): void {
  if (typeof window === 'undefined') return;
  
  // Global unhandled rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Check if this is an abort error - these are expected during navigation
    if (
      error instanceof DOMException && 
      (
        error.name === 'AbortError' || 
        error.message.includes('aborted') || 
        error.message.includes('abort')
      )
    ) {
      // Prevent default error handling for abort errors
      event.preventDefault();
      console.debug('Filtered unhandled promise rejection (abort):', error.message);
      return false;
    }
    
    // Also handle generic fetch errors during abort
    if (
      error && 
      typeof error.message === 'string' && 
      (
        error.message.includes('fetch') && 
        error.message.includes('abort') ||
        error.message.includes('signal is aborted')
      )
    ) {
      // Prevent default handling
      event.preventDefault();
      console.debug('Suppressed fetch abort error:', error.message);
      return false;
    }
    
    // Allow other errors to propagate
    return true;
  }, true);
}

/**
 * Adds CSS to suppress error overlays from showing (Dev mode only)
 */
function addCssSuppression(): void {
  // Only run in browser and development mode
  if (typeof document === 'undefined' || !import.meta.env.DEV) return;
  
  // Create a style element
  const style = document.createElement('style');
  style.textContent = `
    /* Hide Vite error overlays for abort errors */
    div[data-vite-error-overlay]:has(pre:contains("signal is aborted")),
    div[data-vite-dev-error-overlay]:has(pre:contains("signal is aborted")),
    div[data-plugin="runtime-error-plugin"]:has(pre:contains("signal is aborted")),
    div[style*="z-index: 99999"]:has(pre:contains("signal is aborted")),
    div[style*="fixed"]:has(pre:contains("signal is aborted")) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -9999 !important;
    }
  `;
  
  // Append it to the head
  document.head.appendChild(style);
  
  // Also set up a MutationObserver to immediately hide abort error overlays
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Use Array.from to convert NodeList to a standard array for TypeScript compatibility
        const nodeArray = Array.from(mutation.addedNodes);
        
        // Process each node
        nodeArray.forEach(node => {
          // Only process HTMLElement nodes
          if (node instanceof HTMLElement) {
            // Check for error overlay characteristics
            if (
              node.hasAttribute('data-vite-error-overlay') ||
              node.hasAttribute('data-vite-dev-error-overlay') ||
              (node instanceof HTMLDivElement &&
                node.style.position === 'fixed' &&
                node.style.zIndex === '99999')
            ) {
              // Check if it contains abort-related text
              const textContent = node.textContent || '';
              if (
                textContent.includes('signal is aborted') ||
                textContent.includes('AbortController.abort') ||
                textContent.includes('abort')
              ) {
                console.debug('Preventing Vite error overlay for abort error');
                
                // Set to true if this is an abort error overlay
                const isAbortError = 
                  textContent.includes('signal is aborted without reason') || 
                  textContent.includes('AbortError') || 
                  textContent.includes('The operation was aborted');
                
                if (isAbortError) {
                  // Apply styling to hide abort error overlays
                  node.style.display = 'none';
                  node.style.visibility = 'hidden';
                  node.style.opacity = '0';
                  node.style.pointerEvents = 'none';
                  
                  // Remove it after a delay to ensure it's gone
                  setTimeout(() => {
                    if (node.parentNode) {
                      node.parentNode.removeChild(node);
                    }
                  }, 0);
                }
              }
            }
          }
        });
      }
    }
  });
  
  // Start observing
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// Export utility functions and hooks
export { isAbortError, logError };

// Re-export our safe hooks for easier imports
export {
  safeCancelQueries,
  createSafeAbortController
} from '@/lib/queryClient';

export {
  useSafeQuery,
  useSafeMutation
} from '@/hooks/use-safe-query';

export {
  useSafeAbort,
  useSafeSignal,
  useSafeFetch
} from '@/hooks/use-safe-abort';