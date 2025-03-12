/**
 * Client-side error handling utilities
 * This file provides structured error logging and handling functions for the frontend
 */

import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

// Logging levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Structured error logging with context
 * 
 * @param error The error object
 * @param context Additional context information about where and how the error occurred
 * @returns A unique error ID for tracking
 */
export function logError(error: unknown, context: Record<string, any> = {}): string {
  // Generate a unique error ID for tracking
  const errorId = uuidv4();
  
  // Extract error message and stack
  const errorObj = error instanceof Error 
    ? { message: error.message, stack: error.stack } 
    : { message: String(error) };
  
  // Structure the log with all relevant information
  const logData = {
    errorId,
    timestamp: new Date().toISOString(),
    ...errorObj,
    ...context
  };
  
  // Log to console for development and monitoring tools
  console.error('[ERROR]', logData);
  
  // Return the error ID for reference
  return errorId;
}

/**
 * Log a warning message with context
 * @param message Warning message to log
 * @param context Additional context information 
 */
export function logWarning(message: string, context: Record<string, any> = {}): string {
  // Generate a unique warning ID for tracking
  const logId = uuidv4();
  
  // Structure the log with all relevant information
  const logData = {
    logId,
    level: LogLevel.WARNING,
    timestamp: new Date().toISOString(),
    message,
    ...context
  };
  
  // Log to console for development and monitoring tools
  console.warn('[WARNING]', logData);
  
  // Return the log ID for reference
  return logId;
}

/**
 * React hook for error handling with toast notifications
 */
export function useErrorHandler() {
  const { toast } = useToast();
  
  /**
   * Handle an error with a toast notification and logging
   * @param error The error object
   * @param context Additional context information
   * @param showToast Whether to show a toast notification (default: true)
   * @returns The error ID for reference
   */
  const handleError = (error: unknown, context: Record<string, any> = {}, showToast: boolean = true) => {
    const errorId = logError(error, context);
    
    // Only show toast if requested (default) to avoid redundant UI feedback
    if (showToast) {
      toast({
        title: "Error",
        description: formatApiError(error) || `Ocurrió un error. ID: ${errorId.substring(0, 8)}`,
        variant: "destructive",
      });
    }
    
    return errorId;
  };
  
  /**
   * Create an error handler function for a specific component
   */
  const createComponentErrorHandler = (componentName: string) => {
    return (error: unknown, additionalContext: Record<string, any> = {}) => {
      return handleError(error, { component: componentName, ...additionalContext });
    };
  };
  
  return { handleError, createComponentErrorHandler };
}

/**
 * Format API error messages in a user-friendly way
 * @param error The error from an API request
 * @returns A user-friendly error message
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    // For connection errors
    if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
      return 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    }
    
    // For timeout errors
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'La solicitud tardó demasiado tiempo. Intente nuevamente.';
    }
    
    return error.message;
  }
  
  // For non-Error objects, convert to string
  return String(error);
}

/**
 * Handle and track common API response errors
 * @param response The fetch API response
 * @returns The error message and status code if there's an error, null otherwise
 */
export async function handleApiResponse(response: Response): Promise<{ error: string, statusCode: number } | null> {
  if (!response.ok) {
    const statusCode = response.status;
    let errorMessage = `Error ${statusCode}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If we can't parse the JSON, just use the status text
      errorMessage = response.statusText || errorMessage;
    }
    
    // Log the error
    logError(new Error(errorMessage), { 
      statusCode, 
      endpoint: response.url,
      apiError: true 
    });
    
    return { error: errorMessage, statusCode };
  }
  
  return null;
}