/**
 * Custom hook for handling API errors throughout the application
 * This centralizes error handling logic for all API calls
 */
import { useToast } from '@/hooks/use-toast';
import { captureError } from '@/lib/error-handling/monitoring';

/**
 * Type for error handler options
 */
export interface ErrorHandlerOptions {
  /** Context where the error occurred (component name, page, etc.) */
  context?: string;
  /** Show a toast notification for this error */
  showToast?: boolean;
  /** Operation being performed when the error occurred */
  operation?: string;
  /** Any additional metadata for the error */
  metadata?: Record<string, any>;
}

/**
 * Custom hook to handle errors consistently across the application
 * @returns Object with handleError function
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle an error consistently throughout the application
   * @param error The error object or message
   * @param options Options for handling the error
   * @returns Error ID for reference
   */
  const handleError = (error: unknown, options: ErrorHandlerOptions = {}): string => {
    // Default options
    const { 
      context = 'application', 
      showToast = true, 
      operation = 'unknown',
      metadata = {}
    } = options;

    // Skip AbortErrors - these are normal during navigation
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug(`Request aborted in ${context}`);
      return ''; // No error ID for aborted requests
    }

    // Get error details
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    
    // Additional context for the error
    const errorContext = {
      context,
      operation,
      ...metadata
    };

    // Capture error in monitoring system
    const errorId = captureError(error, errorContext);
    
    // Show toast notification if requested
    if (showToast) {
      toast({
        title: `Error in ${context}`,
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    return errorId;
  };

  return { handleError };
}