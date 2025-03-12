/**
 * Error monitoring and reporting functions
 * This module handles capturing and reporting errors to various services
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Context information for an error
 */
export interface ErrorContext {
  [key: string]: any;
}

/**
 * Interface for a captured error with context
 */
export interface CapturedError {
  errorId: string;
  message: string;
  timestamp: string;
  stack?: string;
  type: string;
  context?: ErrorContext;
  url: string;
  userAgent: string;
}

/**
 * In-memory store for recent errors
 * This is useful for debugging when no external error service is configured
 */
const errorStore: CapturedError[] = [];
const MAX_STORED_ERRORS = 50;

/**
 * Capture an error with additional context
 * This will report the error to configured monitoring services
 * and store it in the local error store
 * 
 * @param error The error object or message
 * @param context Additional information about the error
 * @returns The generated error ID
 */
export function captureError(
  error: unknown,
  context: ErrorContext = {}
): string {
  // Generate a unique ID for the error
  const errorId = uuidv4();
  
  // Extract error information
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorType = errorObj.name || 'Unknown';
  const errorMessage = errorObj.message || 'An unknown error occurred';
  
  // Create a captured error object
  const capturedError: CapturedError = {
    errorId,
    message: errorMessage,
    timestamp: new Date().toISOString(),
    stack: errorObj.stack,
    type: errorType,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Monitoring]', capturedError);
  }
  
  // Store the error locally
  errorStore.unshift(capturedError);
  if (errorStore.length > MAX_STORED_ERRORS) {
    errorStore.pop();
  }
  
  // Report to external service if configured
  // This would normally send to a service like Sentry, LogRocket, etc.
  // reportToExternalService(capturedError);
  
  return errorId;
}

/**
 * Get all captured errors from the local store
 * This is useful for debugging and error inspection
 * 
 * @returns Array of captured errors
 */
export function getRecentErrors(): CapturedError[] {
  return [...errorStore];
}

/**
 * Get a specific error by ID
 * 
 * @param errorId The unique ID of the error
 * @returns The error or null if not found
 */
export function getErrorById(errorId: string): CapturedError | null {
  return errorStore.find(error => error.errorId === errorId) || null;
}

/**
 * Clear all errors from the local store
 */
export function clearErrorStore(): void {
  errorStore.length = 0;
}

/**
 * Creates a unique label for an error
 * This can be used to group similar errors together
 * 
 * @param message Error message
 * @param type Error type or name
 * @returns A fingerprint string for the error
 */
export function createErrorFingerprint(message: string, type: string): string {
  // Simplify the message to avoid excessive unique errors
  const simplifiedMessage = message
    .replace(/[0-9]+/g, 'N') // Replace numbers
    .replace(/(['"]).*?(['"])/g, '$1S$2') // Replace string contents
    .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
    .trim();
    
  return `${type}:${simplifiedMessage}`;
}

/**
 * Report error to the server for server-side logging
 * This can be useful for aggregating client-side errors on the server
 * 
 * @param error The captured error to report
 */
export async function reportErrorToServer(error: CapturedError): Promise<void> {
  try {
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(error)
    });
  } catch (reportingError) {
    // Don't report errors in the error reporter to avoid loops
    console.error('Failed to report error to server:', reportingError);
  }
}