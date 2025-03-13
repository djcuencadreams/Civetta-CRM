/**
 * Global error handling system for the entire application
 * This module provides a comprehensive approach to handling errors,
 * with special focus on AbortError suppression.
 */

/**
 * Enhanced function to check if an error is specifically related to AbortController signals
 * 
 * This function ONLY returns true for genuine AbortController abort signals and 
 * excludes generic errors that might mention "abort" unless explicitly tied to fetch abort signals.
 * 
 * @param error Any potential error to check
 * @param options Optional configuration for error detection behavior
 * @returns true if and only if this is a genuine fetch abort error
 */
export function isAbortError(
  error: any, 
  options: { verbose?: boolean } = { verbose: false }
): boolean {
  // Skip early if null or undefined
  if (!error) return false;
  
  const verbose = options.verbose ?? false;
  
  // TIER 1: Check for canonical AbortError (most reliable)
  // This is the standard way browsers represent AbortController signals
  if (error instanceof DOMException && error.name === 'AbortError') {
    if (verbose) console.debug('CONFIRMED genuine DOMException AbortError:', error.message);
    return true;
  }
  
  // TIER 2: Check for name-based identification (also reliable, but less canonical)
  // This covers custom errors that properly use the AbortError name
  if (error.name === 'AbortError') {
    if (verbose) console.debug('CONFIRMED AbortError by standard name:', error.message);
    return true;
  }
  
  // TIER 3: Check for specific AbortSignal properties (reliable for AbortSignal objects)
  // If the error has an aborted signal property, it's directly from AbortController
  if (error.signal && typeof error.signal.aborted === 'boolean' && error.signal.aborted) {
    if (verbose) console.debug('CONFIRMED AbortError via signal property');
    return true;
  }
  
  // TIER 4: Check for highly specific message patterns (moderately reliable)
  // Only accept exact canonical messages, not generic mentions of "abort"
  if (error.message && typeof error.message === 'string') {
    const msg = error.message.toLowerCase().trim();
    
    // Only exact matches for standard abort messages from browsers
    // DO NOT match any string containing "abort" - that's too broad
    const EXACT_ABORT_MESSAGES = [
      'signal is aborted without reason',
      'the operation was aborted',
      'the user aborted a request',
      'aborted',
      'abort'
    ];
    
    // At least one of these phrases MUST be present for us to consider it a fetch-related abort
    const FETCH_RELATED_PHRASES = [
      'fetch',
      'request',
      'xhr',
      'http',
      'network',
      'signal',
      'controller'
    ];
    
    // True only for exact abort message matches...
    const isExactAbortMessage = EXACT_ABORT_MESSAGES.some(pattern => msg === pattern);
    
    // ...or specific combinations of abort + fetch terms
    const hasFetchContext = FETCH_RELATED_PHRASES.some(term => msg.includes(term));
    const mentionsAbort = msg.includes('abort');
    const mentionsSignal = msg.includes('signal');
    
    // Check for the most reliable message pattern combinations
    if (isExactAbortMessage) {
      if (verbose) console.debug('CONFIRMED AbortError by exact message match:', msg);
      return true;
    }
    
    // Check for message pattern that combines abort + fetch concepts
    if (mentionsAbort && mentionsSignal) {
      if (verbose) console.debug('CONFIRMED AbortError by signal+abort message pattern:', msg);
      return true;
    }
    
    // Only accept "abort" if there's explicit fetch context, to avoid false positives
    if (mentionsAbort && hasFetchContext) {
      if (verbose) console.debug('CONFIRMED AbortError with fetch context:', msg);
      return true;
    }
    
    // All other message patterns should NOT be treated as AbortErrors
  }
  
  // TIER 5: Stack analysis for fetch abort context (least reliable, use cautiously)
  // Most specific stack patterns that reliably indicate AbortController usage
  if (error.stack && typeof error.stack === 'string') {
    const stack = error.stack.toLowerCase();
    
    // Very specific stack patterns that reliably indicate AbortController/fetch cancellation
    const hasAbortControllerStack = (
      stack.includes('abortcontroller.abort') || 
      (stack.includes('abortcontroller') && stack.includes('abort('))
    );
    
    // Explicitly fetch-related context in combination with abort
    const hasFetchAbortStack = (
      stack.includes('fetch') && 
      stack.includes('abort') && 
      (stack.includes('signal') || stack.includes('controller'))
    );
    
    if (hasAbortControllerStack) {
      if (verbose) console.debug('CONFIRMED AbortError by AbortController stack trace');
      return true;
    }
    
    if (hasFetchAbortStack) {
      if (verbose) console.debug('CONFIRMED AbortError by fetch+abort stack pattern');
      return true;
    }
  }
  
  // If we got here, this is NOT a genuine AbortController error
  // Log it only in verbose mode for debugging
  if (verbose && error.message) {
    console.debug('NOT an AbortError:', error.message);
  }
  
  return false;
}

/**
 * Enhanced error logging with detailed context
 * Provides different levels of logging based on error type
 * 
 * @param error The error to log
 * @param context Additional contextual information about the error
 * @param options Optional configuration for logging behavior
 */
export function logError(
  error: any, 
  context: Record<string, any> = {},
  options: { 
    suppressAbortErrors?: boolean; 
    detailedAbortLogs?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  } = {}
): void {
  // Default options
  const { 
    suppressAbortErrors = true,
    detailedAbortLogs = true,
    logLevel = 'error'
  } = options;
  
  // Check if it's an abort error with our enhanced checks
  const isAbort = isAbortError(error, { verbose: detailedAbortLogs });
  
  // Determine appropriate log level based on error type
  if (isAbort) {
    if (suppressAbortErrors) {
      // For abort errors, provide detailed debug logging when suppressing
      if (detailedAbortLogs) {
        console.debug('Suppressed AbortError with details:', {
          message: error?.message || 'No message',
          name: error?.name || 'Unknown error type',
          stack: error?.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace',
          timestamp: new Date().toISOString(),
          context: { ...context, suppressed: true, type: 'abort-error' }
        });
      } else {
        // Simple logging for abort errors when details aren't needed
        console.debug('Suppressed abort error:', error?.message || 'No message');
      }
      return;
    }
    
    // If we're not suppressing, use info level for aborts instead of error
    console.info('Non-critical abort signal:', {
      message: error?.message || String(error),
      name: error?.name,
      context: { ...context, type: 'abort-signal' },
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // For all other errors, log at the specified level or default to error
  const logger = console[logLevel] || console.error;
  
  // Log with full context for non-abort errors
  logger('Application error:', {
    message: error?.message || String(error),
    name: error?.name || 'Unknown error type',
    stack: error?.stack,
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Set up global handlers for different error types
 * 
 * This function installs event listeners for errors and unhandled rejections,
 * handling them appropriately based on their type
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    const context = {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    };
    
    // Check if this is a fetch abort signal
    if (isAbortError(error, { verbose: true })) {
      // Prevent propagation for abort errors
      event.preventDefault();
      
      // Use our enhanced logging with detailed context for debugging
      logError(error, {
        ...context,
        handled: true,
        prevented: true,
        eventType: 'error'
      }, {
        suppressAbortErrors: true,
        detailedAbortLogs: true,
        logLevel: 'debug'
      });
      
      return false; // Stop propagation
    }
    
    // For all other errors, log with full context at error level
    logError(error, context, {
      suppressAbortErrors: true,
      detailedAbortLogs: true
    });
  });
  
  // Enhanced handler for unhandled promise rejections with better context
  window.addEventListener('unhandledrejection', (event) => {
    // Extract the error object from the promise rejection
    const error = event.reason;
    const context = {
      source: 'unhandledrejection',
      type: event.type,
      timestamp: new Date().toISOString()
    };
    
    // Check if this is an AbortController signal with our enhanced detection
    if (isAbortError(error, { verbose: true })) {
      // Prevent default browser handling for abort errors
      event.preventDefault();
      
      // Log with detailed context but at debug level
      logError(error, {
        ...context,
        handled: true,
        prevented: true,
        eventType: 'unhandledrejection'
      }, {
        suppressAbortErrors: true,
        detailedAbortLogs: true,
        logLevel: 'debug'
      });
      
      return false; // Stop propagation
    }
    
    // For real errors (not aborts), log with full context at error level
    logError(error, context, {
      suppressAbortErrors: true,
      detailedAbortLogs: false, // No need for abort details on non-abort errors
      logLevel: 'error'
    });
  });
  
  // Add a global event listener for explicit request aborts
  window.addEventListener('abort-pending-requests', (event) => {
    console.debug('Global abort event received, canceling all in-flight requests', {
      timestamp: new Date().toISOString(),
      type: 'navigation-abort'
    });
  });
  
  // Add a navigation listener to detect page changes
  if (typeof window !== 'undefined' && 'navigation' in window) {
    // @ts-ignore - TypeScript might not recognize the newer Navigation API
    window.navigation?.addEventListener('navigate', (event) => {
      // Only log for actual navigation, not just hash changes
      if (event.destination?.url !== window.location.href) {
        console.debug('Navigation detected, requests may be aborted', {
          from: window.location.href,
          to: event.destination?.url,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  console.debug('Global error handlers installed successfully');
}

// Initialize when imported
setupGlobalErrorHandlers();