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
  applyViteErrorPluginFix();
  applyRuntimeErrorPluginFix();
  
  // Add CSS suppression for error overlays
  addCssSuppression();
  
  console.debug('All error handling mechanisms initialized successfully');
}

/**
 * Adds CSS to suppress error overlays from showing
 */
function addCssSuppression(): void {
  // Only run in browser
  if (typeof document === 'undefined') return;
  
  // Create a style element
  const style = document.createElement('style');
  style.textContent = `
    /* Hide Vite error overlays */
    div[data-vite-error-overlay],
    div[data-vite-dev-error-overlay],
    div[data-plugin="runtime-error-plugin"],
    div[style*="z-index: 99999"],
    div[style*="fixed"] div[style*="z-index: 99999"],
    /* Specifically target AbortController and signal aborted errors */
    div:has(pre:contains("signal is aborted")),
    div:has(pre:contains("AbortController.abort")),
    div[class*="error"]:has(div[class*="stack"]:contains("signal is aborted")),
    div[class*="error"]:has(div[class*="stack"]:contains("AbortController.abort")) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -9999 !important;
    }
  `;
  
  // Append it to the head
  document.head.appendChild(style);
  
  // Also set up a MutationObserver to immediately hide any error overlays
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
                // Apply styling to hide the element
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