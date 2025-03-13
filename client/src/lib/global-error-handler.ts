/**
 * Global error handling system for the entire application
 * This module provides a comprehensive approach to handling errors,
 * with special focus on AbortError suppression.
 */

// Check if an error is an AbortError or related to abort
export function isAbortError(error: any): boolean {
  // Check if the error is explicitly an AbortError
  if (error?.name === 'AbortError') {
    return true;
  }
  
  // Check if the error message contains abort-related text
  if (error?.message && typeof error.message === 'string') {
    const lowerCaseMessage = error.message.toLowerCase();
    if (
      lowerCaseMessage.includes('abort') ||
      lowerCaseMessage.includes('signal is aborted') ||
      lowerCaseMessage.includes('user aborted') ||
      lowerCaseMessage.includes('component unmount')
    ) {
      return true;
    }
  }
  
  // Check error stack for abort-related text
  if (error?.stack && typeof error.stack === 'string') {
    const lowerCaseStack = error.stack.toLowerCase();
    if (
      lowerCaseStack.includes('abortcontroller') ||
      lowerCaseStack.includes('abort') ||
      lowerCaseStack.includes('signal')
    ) {
      return true;
    }
  }
  
  // Not an abort error
  return false;
}

// Log an error with useful context
export function logError(error: any, context: Record<string, any> = {}): void {
  // Skip logging AbortErrors if they're just normal navigation aborts
  if (isAbortError(error)) {
    console.debug('Suppressed abort error:', error);
    return;
  }
  
  // Log real errors with full context
  console.error('Application error:', {
    error,
    message: error?.message || String(error),
    stack: error?.stack,
    ...context,
    timestamp: new Date().toISOString()
  });
}

// Set up global handlers for different error types
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    // Prevent errors from being shown if they're abort-related
    if (isAbortError(event.error)) {
      event.preventDefault();
      console.debug('Prevented error event for aborted request:', event.error?.message || 'Unknown abort error');
      return;
    }
    
    // Log the error with context
    logError(event.error || new Error(event.message), {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Extract the error object from the promise rejection
    const error = event.reason;
    
    // If it's an abort error, suppress it
    if (isAbortError(error)) {
      event.preventDefault();
      console.debug('Suppressed unhandled promise rejection (abort error):', error?.message || 'Unknown abort error');
      return;
    }
    
    // Log real errors
    logError(error, {
      source: 'unhandledrejection',
      type: event.type
    });
  });
  
  // Add a global event listener for request aborts
  window.addEventListener('abort-pending-requests', () => {
    console.debug('Global abort event received, canceling all in-flight requests');
  });
  
  console.debug('Global error handlers installed successfully');
}

// Initialize when imported
setupGlobalErrorHandlers();