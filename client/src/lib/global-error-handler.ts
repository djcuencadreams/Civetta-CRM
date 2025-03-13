/**
 * Global error handler for handling unhandled exceptions and promise rejections
 * This module specifically distinguishes between genuine runtime errors and expected abort signals
 */

// Keep track of the number of aborts handled globally for verification
let abortErrorsHandled = 0;
let runtimeErrorsHandled = 0;
let unhandledRejectionsHandled = 0;

/**
 * Initialize global error handlers to properly handle and log errors
 * based on their type and severity
 */
export function initializeGlobalErrorHandlers(): void {
  // Handle synchronous errors and exceptions
  window.addEventListener('error', event => {
    const error = event.error;
    if (error && error.name === 'AbortError') {
      abortErrorsHandled++;
      console.debug(`[Global Handler] Ignored expected abort error (${abortErrorsHandled} total):`, error.message);
      event.preventDefault();
      return;
    }

    runtimeErrorsHandled++;
    console.error(`[Global Handler] Unhandled runtime error (${runtimeErrorsHandled} total):`, error.message, error.stack);
  });

  // Handle asynchronous promise rejections
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    if (error && error.name === 'AbortError') {
      abortErrorsHandled++;
      console.debug(`[Global Handler] Ignored expected fetch abort (${abortErrorsHandled} total):`, error.message);
      event.preventDefault();
      return;
    }

    unhandledRejectionsHandled++;
    console.error(`[Global Handler] Unhandled promise rejection (${unhandledRejectionsHandled} total):`, error);
  });

  console.log('Global error handlers initialized');
  
  // Expose handler stats to the window for verification
  (window as any).getErrorHandlerStats = () => ({
    abortErrorsHandled,
    runtimeErrorsHandled,
    unhandledRejectionsHandled
  });
}