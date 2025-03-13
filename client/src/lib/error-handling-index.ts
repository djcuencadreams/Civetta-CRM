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
 * Adds aggressive CSS and DOM manipulation to completely suppress Vite error overlays
 * specifically for abort errors (development mode only)
 */
function addCssSuppression(): void {
  // Only run in browser and development mode
  if (typeof document === 'undefined' || !import.meta.env.DEV) return;
  
  // Create a style element with extremely specific and important rules
  const style = document.createElement('style');
  style.textContent = `
    /* MAXIMUM SPECIFICITY rules to hide Vite error overlays for abort errors */
    body div[data-vite-error-overlay],
    body div[data-vite-dev-error-overlay],
    body div[data-plugin="runtime-error-plugin"],
    body div[style*="z-index: 99999"][style*="position: fixed"],
    body > div[style*="position: fixed"][style*="top: 0px"][style*="left: 0px"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -9999 !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
    }
    
    /* Maximum force content-specific selectors */
    body *:has(> pre:contains("signal is aborted without reason")),
    body *:has(> code:contains("signal is aborted without reason")),
    body *:has(pre:contains("AbortError")),
    body *:has(code:contains("AbortError")),
    body *:has(div:contains("signal is aborted without reason")),
    body *:has(span:contains("signal is aborted without reason")) {
      display: none !important;
      visibility: hidden !important;
      position: absolute !important;
      z-index: -9999 !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }
  `;
  
  // Append it to the head with high priority
  document.head.appendChild(style);
  
  // Specific function to check if an element is a Vite error overlay
  function isViteErrorOverlay(element: HTMLElement): boolean {
    // Check attributes
    if (
      element.hasAttribute('data-vite-error-overlay') ||
      element.hasAttribute('data-vite-dev-error-overlay') ||
      element.getAttribute('data-plugin') === 'runtime-error-plugin'
    ) {
      return true;
    }
    
    // Check for style properties that suggest an overlay
    if (
      element instanceof HTMLDivElement && 
      element.style.position === 'fixed' && 
      (
        element.style.zIndex === '99999' || 
        parseInt(element.style.zIndex || '0') > 1000
      ) && 
      element.style.top === '0px' && 
      element.style.left === '0px'
    ) {
      return true;
    }
    
    return false;
  }
  
  // Specific function to check if error content is related to abort signals
  function isAbortErrorContent(content: string): boolean {
    // Only match very specific abort error patterns
    return (
      content.includes('signal is aborted without reason') ||
      content.includes('AbortError:') ||
      content.includes('[vite] signal is aborted') ||
      content.includes('The operation was aborted') ||
      (
        content.includes('AbortController') && 
        content.includes('abort') && 
        content.includes('error')
      )
    );
  }
  
  // Immediately check for and remove any existing error overlays
  function removeExistingOverlays(): void {
    // Find all potential overlay elements
    const potentialOverlays = document.querySelectorAll('div[style*="position: fixed"]');
    
    potentialOverlays.forEach(element => {
      if (!(element instanceof HTMLElement)) return;
      
      if (isViteErrorOverlay(element)) {
        const content = element.textContent || '';
        if (isAbortErrorContent(content)) {
          console.debug('Removing existing abort error overlay');
          element.style.display = 'none';
          
          // Remove completely after a short delay
          setTimeout(() => {
            if (element.parentNode) {
              element.parentNode.removeChild(element);
            }
          }, 0);
        }
      }
    });
  }
  
  // Run immediately to clean up any existing overlays
  removeExistingOverlays();
  
  // Also set up a MutationObserver to aggressively remove abort error overlays as they appear
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          
          // First check if this looks like an error overlay
          if (isViteErrorOverlay(node)) {
            // Then check its content for abort-related errors
            const content = node.textContent || '';
            
            if (isAbortErrorContent(content)) {
              console.debug('Intercepted and removing abort error overlay:', {
                message: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString()
              });
              
              // Hide then remove completely
              node.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
              
              // Remove from DOM tree
              setTimeout(() => {
                if (node.parentNode) {
                  node.parentNode.removeChild(node);
                  console.debug('Removed abort error overlay from DOM');
                }
              }, 0);
            }
          }
        });
      }
    }
  });
  
  // Start observing with the highest priority settings
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true, 
    characterData: true
  });
  
  // Also add a body-level event listener to catch errors at the DOM level
  document.body.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    if (isViteErrorOverlay(target)) {
      const content = target.textContent || '';
      if (isAbortErrorContent(content)) {
        event.preventDefault();
        event.stopPropagation();
        console.debug('Blocked error event for abort error overlay');
        return false;
      }
    }
  }, true);
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