/**
 * Server-side Error Handling System
 * 
 * This module exports all components of the error handling system for easy imports
 */

// Export the API error classes
export * from './api-error';

// Export database error utilities
export * from './database-errors';

// Export error handling middleware
export * from './middleware';

// Re-export logging functions from the logger module
export { logError, logWarning, logInfo } from '../logger';

// Import middleware directly
import { errorHandlerMiddleware, notFoundMiddleware } from './middleware';

/**
 * Initialize the error handling system for Express
 * @param app Express application instance
 */
export function initializeErrorHandling(app: any): void {
  // Register the not found middleware (after all routes)
  app.use(notFoundMiddleware);
  
  // Register the error handler middleware (must be last)
  app.use(errorHandlerMiddleware);
}

/**
 * Creates an enhanced error with a code and context
 * @param message Error message
 * @param code Error code (optional)
 * @param context Additional error context (optional)
 * @returns Enhanced error object
 */
export function createError(
  message: string,
  code?: string,
  context?: Record<string, any>
): Error & { code?: string; context?: Record<string, any> } {
  const error = new Error(message) as Error & { 
    code?: string; 
    context?: Record<string, any> 
  };
  
  if (code) {
    error.code = code;
  }
  
  if (context) {
    error.context = context;
  }
  
  return error;
}

/**
 * Safely extract an error message from any error type
 * @param error The error object or value
 * @param fallback Fallback message if none is available
 * @returns A string error message
 */
export function getErrorMessage(
  error: unknown, 
  fallback: string = 'An unknown error occurred'
): string {
  if (!error) {
    return fallback;
  }
  
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object') {
    const errorObj = error as any;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  
  return String(error) || fallback;
}