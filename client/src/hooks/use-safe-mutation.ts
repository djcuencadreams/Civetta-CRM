/**
 * Custom hook for safe mutations with improved error handling
 * This hook wraps TanStack Query's useMutation with additional error handling
 */
import { useState, useEffect } from 'react';
import { 
  useMutation, 
  UseMutationResult, 
  MutationKey,
  UseMutationOptions
} from '@tanstack/react-query';
import { captureError } from '@/lib/error-handling/monitoring';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

/**
 * Type for the error state with additional context
 */
export interface EnhancedMutationErrorState {
  message: string;
  errorId?: string;
  statusCode?: number;
  timestamp: Date;
  mutationKey?: MutationKey;
  validationErrors?: Record<string, string[]>;
  details?: unknown;
}

/**
 * Hook options extending TanStack Mutation options
 */
export interface UseSafeMutationOptions<TData, TVariables, TError, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  /**
   * Whether to show success toast notification
   */
  showSuccessToast?: boolean;
  
  /**
   * Whether to show error toast notification
   */
  showErrorToast?: boolean;
  
  /**
   * Custom success message to display
   */
  successMessage?: string;
  
  /**
   * Custom error message to display
   */
  errorMessage?: string;
  
  /**
   * Whether to capture the error in monitoring system
   */
  captureInMonitoring?: boolean;
  
  /**
   * Method for the API request (POST, PUT, PATCH, DELETE)
   */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /**
   * Endpoint for the API request
   */
  endpoint?: string;
  
  /**
   * Custom mutation function (if not using apiRequest)
   */
  mutationFn?: (variables: TVariables) => Promise<TData>;
}

/**
 * Safely executes a mutation with enhanced error handling
 * 
 * @param mutationKey - Optional mutation key for cache management
 * @param options - Mutation options including error handling settings
 * @returns Mutation result and enhanced error state
 */
export function useSafeMutation<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TContext = unknown
>(
  mutationKeyOrOptions: MutationKey | UseSafeMutationOptions<TData, TVariables, TError, TContext>,
  options?: UseSafeMutationOptions<TData, TVariables, TError, TContext>
): [UseMutationResult<TData, TError, TVariables, TContext>, EnhancedMutationErrorState | null] {
  // Parse arguments to handle both call styles
  const [mutationKey, mutationOptions] = typeof mutationKeyOrOptions === 'object' && !Array.isArray(mutationKeyOrOptions)
    ? [undefined, mutationKeyOrOptions as UseSafeMutationOptions<TData, TVariables, TError, TContext>]
    : [mutationKeyOrOptions as MutationKey, options || {}];
  
  // Default options
  const {
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
    captureInMonitoring = true,
    method = 'POST',
    endpoint,
    mutationFn,
    ...mutationOptions2
  } = mutationOptions || {};
  
  // Enhanced error state
  const [errorState, setErrorState] = useState<EnhancedMutationErrorState | null>(null);
  
  // Create mutation function if endpoint is provided
  const defaultMutationFn = endpoint
    ? (variables: TVariables) => apiRequest({ 
        method, 
        url: endpoint, 
        body: variables 
      }) as Promise<TData>
    : mutationFn;
  
  // Since TypeScript has issues with the spread operator losing type information,
  // we'll use casting and manual safe property access
  const typedOptions = mutationOptions2 as any;
  const originalOnSuccess = typedOptions?.onSuccess;
  const originalOnError = typedOptions?.onError;
  
  // Use TanStack Mutation
  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationKey,
    mutationFn: defaultMutationFn,
    ...mutationOptions2,
    onSuccess: (data, variables, context) => {
      // Show success toast if enabled
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage,
          variant: 'default',
        });
      }
      
      // Call original onSuccess if provided
      if (originalOnSuccess) {
        originalOnSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Extract error details
      const err = error as any;
      
      // Create enhanced error state
      const enhancedError: EnhancedMutationErrorState = {
        message: err?.message || err?.response?.data?.message || errorMessage,
        errorId: err?.errorId || err?.response?.data?.errorId,
        statusCode: err?.statusCode || err?.response?.status,
        timestamp: new Date(),
        mutationKey,
        validationErrors: err?.validationErrors || err?.response?.data?.validationErrors,
        details: err
      };
      
      // Update error state
      setErrorState(enhancedError);
      
      // Show error toast if enabled
      if (showErrorToast) {
        const description = enhancedError.validationErrors
          ? 'Please check the form for errors'
          : enhancedError.message;
          
        toast({
          title: 'Error',
          description,
          variant: 'destructive',
        });
      }
      
      // Capture in monitoring system if enabled
      if (captureInMonitoring) {
        captureError(error, {
          source: 'useSafeMutation',
          mutationKey: mutationKey ? Array.isArray(mutationKey) ? mutationKey.join('.') : String(mutationKey) : endpoint || 'unknown',
          operation: 'mutation',
          method,
          variables: JSON.stringify(variables).substring(0, 500) // Truncate to avoid huge logs
        });
      }
      
      // Call original onError if provided
      if (originalOnError) {
        originalOnError(error, variables, context);
      }
    }
  });
  
  // Reset error state on success
  useEffect(() => {
    if (mutation.isSuccess) {
      setErrorState(null);
    }
  }, [mutation.isSuccess]);
  
  return [mutation, errorState];
}

/**
 * Alternative hook with object return style for destructuring
 */
export function useSafeMutationObj<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TContext = unknown
>(
  mutationKeyOrOptions: MutationKey | UseSafeMutationOptions<TData, TVariables, TError, TContext>,
  options?: UseSafeMutationOptions<TData, TVariables, TError, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> & { 
  enhancedError: EnhancedMutationErrorState | null 
} {
  const [mutation, enhancedError] = useSafeMutation(mutationKeyOrOptions, options);
  return { ...mutation, enhancedError };
}