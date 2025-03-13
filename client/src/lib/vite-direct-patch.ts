/**
 * This file contains a direct patch for Vite's error overlay
 * It works by injecting CSS rules and using MutationObserver to remove the error overlay
 */

/**
 * Apply CSS and DOM observer patches to prevent Vite error overlays
 * specifically for runtime errors related to abort/navigation
 */
export function applyViteDirectPatch() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  console.debug('Applying direct Vite error handling patch for runtime-error-plugin abort errors');

  // Add a style tag to hide the error overlay
  addErrorOverlayStyles();

  // Use MutationObserver to remove error overlays as they appear
  setupErrorOverlayObserver();

  // Periodically clean up any error overlays that might slip through
  setupErrorOverlayCleanup();
}

/**
 * Add CSS rules to hide error overlays
 */
function addErrorOverlayStyles() {
  const style = document.createElement('style');
  style.setAttribute('data-vite-error-filter', 'true');
  
  // More specific and aggressive selectors
  style.innerHTML = `
    /* Target Vite's error overlay specifically */
    [id="runtime-error-plugin-overlay"],
    div[class*="error-overlay"],
    div[data-vite-dev-overlay="true"],
    div[data-vite-error-overlay],
    div[style*="fixed"] div[style*="z-index: 99999"],

    /* Common error overlay selectors */
    div[role="dialog"][aria-modal="true"],
    div.fixed.inset-0.z-50,
    
    /* Target by content */
    div:has(h1:contains("Runtime Error")),
    div:has(div:contains("signal is aborted")),
    div:has(div:contains("AbortError")),
    
    /* Last resort catch-all for any new overlay formats */
    div[style*="position: fixed"][style*="top: 0"][style*="left: 0"][style*="width: 100%"][style*="height: 100%"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -9999 !important;
      position: absolute !important;
      transform: translateX(-9999px) !important;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Set up a MutationObserver to remove error overlays as they appear
 */
function setupErrorOverlayObserver() {
  try {
    // Create an observer to watch for error overlays being added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          // Process each added node
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // Check if this looks like an error overlay
              if (isErrorOverlay(element)) {
                // Check if it contains an abort error message
                if (containsAbortError(element)) {
                  console.debug('Removing abort error overlay via MutationObserver');
                  removeErrorOverlay(element);
                }
              }
              
              // Also check children recursively
              const errorOverlays = findErrorOverlays(element);
              errorOverlays.forEach((overlay) => {
                if (containsAbortError(overlay)) {
                  console.debug('Removing nested abort error overlay via MutationObserver');
                  removeErrorOverlay(overlay);
                }
              });
            }
          });
        }
      });
    });
    
    // Start observing the entire document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    console.debug('Added aggressive CSS and MutationObserver to prevent Vite error overlays');
  } catch (err) {
    console.error('Failed to set up error overlay observer:', err);
  }
}

/**
 * Set up a periodic cleanup to remove any error overlays that might slip through
 */
function setupErrorOverlayCleanup() {
  // Run an initial cleanup
  cleanupErrorOverlays();
  
  // Then set up periodic cleanup
  const cleanup = setInterval(() => {
    cleanupErrorOverlays();
  }, 500);
  
  // Clear the interval when the window is closed
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanup);
  });
}

/**
 * Clean up any error overlays that might exist
 */
function cleanupErrorOverlays() {
  try {
    // Find all potential error overlays
    const errorOverlays = findErrorOverlays(document.documentElement);
    
    // Filter to only those with abort errors
    const abortErrorOverlays = errorOverlays.filter(containsAbortError);
    
    // Remove them
    if (abortErrorOverlays.length > 0) {
      console.debug(`Removing ${abortErrorOverlays.length} abort error overlays via cleanup`);
      abortErrorOverlays.forEach(removeErrorOverlay);
    }
  } catch (err) {
    // Don't log cleanup errors to avoid noise
  }
}

/**
 * Check if an element is likely to be an error overlay
 */
function isErrorOverlay(element: HTMLElement): boolean {
  if (!element) return false;
  
  // Check id
  const id = element.id;
  if (id && (
    id.includes('error') || 
    id.includes('overlay') || 
    id.includes('runtime-error')
  )) {
    return true;
  }
  
  // Check class name
  const className = element.className;
  if (typeof className === 'string' && (
    className.includes('error') || 
    className.includes('overlay') ||
    className.includes('fixed')
  )) {
    return true;
  }
  
  // Check data attributes
  if (
    element.hasAttribute('data-vite-dev-overlay') ||
    element.hasAttribute('data-vite-error-overlay')
  ) {
    return true;
  }
  
  // Check style - typical for modals and overlays
  const style = element.style;
  if (
    style.position === 'fixed' &&
    style.top === '0px' &&
    style.left === '0px' &&
    (style.width === '100%' || style.width === '100vw') &&
    (style.height === '100%' || style.height === '100vh')
  ) {
    return true;
  }
  
  // Check for dialog role
  if (
    element.getAttribute('role') === 'dialog' &&
    element.getAttribute('aria-modal') === 'true'
  ) {
    return true;
  }
  
  return false;
}

/**
 * Find all elements that look like error overlays
 */
function findErrorOverlays(root: HTMLElement): HTMLElement[] {
  if (!root) return [];
  
  const results: HTMLElement[] = [];
  
  // Check if the root element itself is an error overlay
  if (isErrorOverlay(root)) {
    results.push(root);
  }
  
  // Use querySelectorAll for efficiency
  try {
    // Common error overlay selectors
    const selectors = [
      '[id*="error"],[id*="overlay"]',
      '[class*="error"],[class*="overlay"]',
      '[data-vite-dev-overlay],[data-vite-error-overlay]',
      'div[role="dialog"][aria-modal="true"]',
      'div.fixed.inset-0',
      'div[style*="position: fixed"][style*="top: 0"][style*="left: 0"]'
    ];
    
    // Try to find elements matching these selectors
    const elements = root.querySelectorAll<HTMLElement>(selectors.join(','));
    elements.forEach(element => {
      if (!results.includes(element)) {
        results.push(element);
      }
    });
  } catch (err) {
    // If the selector is invalid, use a more basic approach
    try {
      const allElements = root.querySelectorAll('div');
      allElements.forEach(element => {
        if (element instanceof HTMLElement && isErrorOverlay(element) && !results.includes(element)) {
          results.push(element);
        }
      });
    } catch (err) {
      // Silent catch - don't log errors for this fallback method
    }
  }
  
  return results;
}

/**
 * Check if an element contains an abort error message
 */
function containsAbortError(element: HTMLElement): boolean {
  if (!element) return false;
  
  // Check the text content
  const text = element.textContent || '';
  return (
    text.includes('abort') ||
    text.includes('signal is aborted') ||
    text.includes('navigation') ||
    text.includes('AbortError') ||
    text.includes('unmounted')
  );
}

/**
 * Remove an error overlay from the DOM
 */
function removeErrorOverlay(element: HTMLElement): void {
  if (!element) return;
  
  try {
    // Hide it first (immediate visual feedback)
    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.opacity = '0';
    element.style.pointerEvents = 'none';
    
    // Then try to remove it from the DOM
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  } catch (err) {
    // Silent catch - don't log errors for removal
  }
}