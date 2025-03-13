/**
 * Patches to improve AbortController behavior
 * This file applies patches to the native AbortController to provide 
 * better error handling for aborted fetch requests
 */

/**
 * Apply patches to AbortController prototype
 * This ensures all AbortControllers in the application will have
 * a proper reason when aborting, preventing "signal aborted without reason" errors
 */
export function applyAbortControllerPatches() {
  if (typeof AbortController === 'undefined') {
    console.warn('AbortController is not available in this environment');
    return;
  }

  // Check if already patched
  if ((AbortController.prototype as any).__patched) {
    return;
  }
  
  // Create a registry of active AbortControllers for global abort handling
  if (typeof window !== 'undefined' && !(window as any).__activeAbortControllers) {
    (window as any).__activeAbortControllers = [];
  }

  // Store original constructor
  const OriginalAbortController = window.AbortController;
  
  // Create a patched AbortController constructor
  window.AbortController = function() {
    const controller = new OriginalAbortController();
    
    // Register this controller in our global registry
    if (typeof window !== 'undefined') {
      (window as any).__activeAbortControllers.push(controller);
      
      // Remove from registry when aborted or when signal is consumed
      const originalAbort = controller.abort;
      controller.abort = function(reason?: any) {
        // Remove from registry
        if (typeof window !== 'undefined') {
          const registry = (window as any).__activeAbortControllers;
          const index = registry.indexOf(controller);
          if (index !== -1) {
            registry.splice(index, 1);
          }
        }
        
        // Call original with our patches
        if (!reason) {
          reason = new DOMException('Component unmounted or navigation occurred', 'AbortError');
        }
        
        // Add reason to signal for better error messages
        if (controller.signal && typeof controller.signal === 'object') {
          // @ts-ignore - Add reason to signal
          controller.signal.reason = typeof reason === 'string' 
            ? { message: reason } 
            : reason;
        }
        
        return originalAbort.call(controller, reason);
      };
    }
    
    return controller;
  } as unknown as typeof AbortController;
  
  // Copy prototype and properties
  window.AbortController.prototype = OriginalAbortController.prototype;
  
  // Store the original abort method
  const originalAbort = AbortController.prototype.abort;

  // Override the abort method for existing AbortController instances
  AbortController.prototype.abort = function(this: AbortController, reason?: any) {
    // If no reason provided, add a default one
    if (!reason) {
      reason = new DOMException('Component unmounted or navigation occurred', 'AbortError');
    }
    
    // Add reason to signal for better error messages
    if (this.signal && typeof this.signal === 'object') {
      // @ts-ignore - Add reason to signal
      this.signal.reason = typeof reason === 'string' 
        ? { message: reason } 
        : reason;
    }
    
    // If this controller is in our registry, remove it
    if (typeof window !== 'undefined') {
      const registry = (window as any).__activeAbortControllers;
      if (Array.isArray(registry)) {
        const index = registry.indexOf(this);
        if (index !== -1) {
          registry.splice(index, 1);
        }
      }
    }
    
    // Call original abort with reason
    return originalAbort.call(this, reason);
  };

  // Mark as patched to avoid double patching
  (AbortController.prototype as any).__patched = true;
  
  console.debug('AbortController successfully patched for better error handling');
}

// Also patch window.fetch to handle aborted requests better
export function applyFetchPatches() {
  if (typeof window.fetch === 'undefined') {
    console.warn('Fetch API is not available in this environment');
    return;
  }
  
  // Check if already patched
  if ((window.fetch as any).__patched) {
    return;
  }
  
  // Store the original fetch
  const originalFetch = window.fetch;
  
  // Override window.fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const promise = originalFetch.call(this, input, init);
    
    return promise.catch(error => {
      // Add better error handling for aborted requests
      if (error && error.name === 'AbortError') {
        // Add explicit message about signal being aborted
        const signal = init?.signal;
        const reason = signal && (signal as any).reason?.message 
          ? (signal as any).reason.message
          : 'Component unmounted or navigation occurred';
          
        console.debug(`Fetch aborted: ${reason}`);
        
        // Create a new error with better message
        const enhancedError = new DOMException(
          `Request aborted: ${reason}`, 
          'AbortError'
        );
        
        throw enhancedError;
      }
      
      throw error;
    });
  };
  
  // Mark as patched to avoid double patching
  (window.fetch as any).__patched = true;
  
  console.debug('Fetch API successfully patched for better error handling');
}