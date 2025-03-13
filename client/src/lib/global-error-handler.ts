/**
 * Global error handler for handling unhandled exceptions and promise rejections
 * This module specifically distinguishes between genuine runtime errors and expected abort signals
 */

/**
 * Initialize global error handlers to properly handle and log errors
 * based on their type and severity
 */
export function initializeGlobalErrorHandlers(): void {
  // Handle synchronous errors and exceptions
  window.addEventListener('error', event => {
    const error = event.error;
    if (error && error.name === 'AbortError') {
      console.debug('Ignored expected abort error:', error.message);
      event.preventDefault();
      return;
    }

    console.error('Unhandled runtime error:', error.message, error.stack);
  });

  // Handle asynchronous promise rejections
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    if (error && error.name === 'AbortError') {
      console.debug('Ignored expected fetch abort:', error.message);
      event.preventDefault();
      return;
    }

    console.error('Unhandled promise rejection:', error);
  });

  console.log('Global error handlers initialized');
}