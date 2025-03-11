import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

/**
 * Error levels following standard logging conventions
 */
export enum ErrorLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Interface for error context data
 */
export interface ErrorContext {
  [key: string]: any;
}

/**
 * Log an error to the browser console with enhanced formatting
 * @param error Error object or error message string
 * @param context Additional context for the error
 * @param level Error severity level
 * @returns Generated error ID for reference
 */
export function logError(
  error: Error | unknown,
  context: ErrorContext = {},
  level: ErrorLevel = ErrorLevel.ERROR
): string {
  // Generate a unique ID for this error unless it already has one
  const errorId = context.errorId || uuidv4();
  
  // Extract error details
  const errorDetails = error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    : {
        message: String(error),
      };
  
  // Create a structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    ...errorDetails,
    ...context,
    errorId,
  };
  
  // Log to console with appropriate level
  if (level === ErrorLevel.ERROR) {
    console.error(`[ERROR-${errorId}]`, logEntry);
  } else if (level === ErrorLevel.WARNING) {
    console.warn(`[WARN-${errorId}]`, logEntry);
  } else {
    console.info(`[INFO-${errorId}]`, logEntry);
  }
  
  return errorId;
}

/**
 * Log a warning to the browser console
 * @param message Warning message
 * @param context Additional context for the warning
 * @returns Generated warning ID for reference
 */
export function logWarning(
  message: string,
  context: ErrorContext = {}
): string {
  return logError(new Error(message), context, ErrorLevel.WARNING);
}

/**
 * Log an info message to the browser console
 * @param message Info message
 * @param context Additional context for the info message
 * @returns Generated message ID for reference
 */
export function logInfo(
  message: string,
  context: ErrorContext = {}
): string {
  return logError(new Error(message), context, ErrorLevel.INFO);
}

/**
 * Show an error toast notification with the error message and ID
 * @param error Error object or message
 * @param title Optional custom title
 */
export function showErrorToast(
  error: Error | unknown,
  title = 'An error occurred'
): void {
  // Extract message from various error types
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Unknown error';
  
  // Extract error ID if available
  const errorId = error instanceof Error 
    ? (error as any).errorId 
    : undefined;
  
  // Show toast notification
  toast({
    variant: 'destructive',
    title,
    description: `${message}${errorId ? ` (Ref: ${errorId.substring(0, 8)})` : ''}`,
  });
}