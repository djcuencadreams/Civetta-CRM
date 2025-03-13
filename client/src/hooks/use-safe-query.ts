/**
 * Safe Query Hooks for React Query
 * 
 * These hooks provide enhanced versions of React Query's useQuery and useMutation
 * with better abort handling to prevent unhandled promise rejections.
 */
import { 
  useQuery as useOriginalQuery, 
  useMutation as useOriginalMutation,
  UseQueryOptions,
  UseMutationOptions,
  UseQueryResult,
  UseMutationResult,
  QueryKey,
  MutationKey
} from '@tanstack/react-query';
import { createSafeAbortController, isAbortError } from '@/lib/queryClient';
import { useEffect, useState } from 'react';

/**
 * Enhanced version of useQuery that handles aborts safely
 * 
 * @param options Standard React Query options
 * @returns UseQueryResult with the same API as the original useQuery
 */
export function useSafeQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey'> & {
    queryKey: TQueryKey;
  }
): UseQueryResult<TData, TError> {
  // Create a safe controller that won't throw on abort
  const [controller] = useState(() => createSafeAbortController('Query component unmount'));
  
  // Add signal to query context if not already provided
  const enhancedOptions = {
    ...options,
    meta: {
      ...options.meta,
      signal: options.meta?.signal || controller.signal
    }
  };
  
  // Use the original query with our enhanced options
  const result = useOriginalQuery<TQueryFnData, TError, TData, TQueryKey>(enhancedOptions);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!controller.signal.aborted) {
        controller.abort('Component unmounted');
      }
    };
  }, [controller]);
  
  return result;
}

/**
 * Enhanced version of useMutation that handles aborts safely
 * 
 * @param options Standard React Query mutation options
 * @returns UseMutationResult with the same API as the original useMutation
 */
export function useSafeMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  options: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationKey'> & {
    mutationKey?: MutationKey;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  // Create a safe controller that won't throw on abort
  const [controller] = useState(() => createSafeAbortController('Mutation component unmount'));
  
  // Handle abort errors in onError callback
  const enhancedOptions = {
    ...options,
    meta: {
      ...options.meta,
      signal: options.meta?.signal || controller.signal
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      // Skip calling the original onError for abort errors
      if (isAbortError(error)) {
        console.debug('Mutation aborted due to component unmount, suppressing error');
        return;
      }
      
      // Call the original onError for non-abort errors
      if (options.onError) {
        options.onError(error, variables, context);
      }
    }
  };
  
  // Use the original mutation with our enhanced options
  const result = useOriginalMutation<TData, TError, TVariables, TContext>(enhancedOptions);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!controller.signal.aborted) {
        controller.abort('Component unmounted');
      }
    };
  }, [controller]);
  
  return result;
}

// Re-export for convenience
export { isAbortError } from '@/lib/queryClient';