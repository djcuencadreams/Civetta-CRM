/**
 * Error retry functionality
 * This module provides utilities for retrying failed operations
 */
import { captureError } from './monitoring';

/**
 * Retry options for retryOperation
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  
  /** Base delay in milliseconds between retries */
  baseDelay?: number;
  
  /** Whether to use exponential backoff (increases delay after each retry) */
  exponential?: boolean;
  
  /** Maximum delay in milliseconds (only used with exponential backoff) */
  maxDelay?: number;
  
  /** Optional function to determine if an error should be retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  
  /** Optional callback for each retry attempt */
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Default retry options
 */
const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 300,
  exponential: true,
  maxDelay: 10000,
  shouldRetry: () => true,
  onRetry: () => {}
};

/**
 * Calculate the delay for a retry attempt with optional exponential backoff
 * 
 * @param attempt Current attempt number (starts at 1)
 * @param options Retry options
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  if (!options.exponential) {
    return options.baseDelay;
  }
  
  // Calculate exponential backoff with some random jitter
  const exponentialDelay = options.baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.2 * exponentialDelay; // 20% random jitter
  
  return Math.min(exponentialDelay + jitter, options.maxDelay);
}

/**
 * Retry an asynchronous operation with configurable retry behavior
 * 
 * @param operation Async function to retry
 * @param options Retry configuration
 * @returns Promise with the operation result
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let attempt = 0;
  
  while (true) {
    attempt++;
    try {
      // Attempt the operation
      return await operation();
    } catch (error) {
      // Determine if we should retry
      const isRetryable = config.shouldRetry(error, attempt);
      const canRetry = attempt < config.maxAttempts && isRetryable;
      
      if (!canRetry) {
        // We've reached max attempts or the error is not retryable
        throw error;
      }
      
      // Capture the error but mark it as being retried
      captureError(error, {
        source: 'retryOperation',
        attempt,
        maxAttempts: config.maxAttempts,
        willRetry: true
      });
      
      // Notify about retry
      config.onRetry(error, attempt);
      
      // Wait before next attempt
      const delay = calculateRetryDelay(attempt, config);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Creates a wrapped function that will automatically retry on failure
 * 
 * @param fn Function to wrap with retry logic
 * @param options Retry options
 * @returns Wrapped function with retry behavior
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retryOperation(() => fn(...args), options);
  };
}