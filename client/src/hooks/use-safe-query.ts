/**
 * Custom React Query hooks with built-in error handling
 * These hooks wrap the standard React Query hooks to provide better error handling,
 * particularly for abort errors during component unmounting.
 */
import { useQuery as useReactQuery, 
         useMutation as useReactMutation,
         UseQueryOptions,
         UseMutationOptions,
         useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { isAbortError } from '@/lib/queryClient';

/**
 * A wrapper around useQuery that provides enhanced error handling
 * and automatically handles AbortError during component unmounting
 * 
 * @param options Options object passed to useQuery
 * @returns The result from useQuery with additional error handling
 */
export function useSafeQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = unknown[]
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryClient'>
) {
  // Store reference to in-flight query
  const queryRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  
  // Create an AbortController for this query
  useEffect(() => {
    // Create a new AbortController for this component
    queryRef.current = new AbortController();
    
    // Clean up on unmount
    return () => {
      // If there's an active query, abort it when the component unmounts
      if (queryRef.current) {
        queryRef.current.abort('Component unmounted');
        queryRef.current = null;
      }
    };
  }, []);
  
  // Use the standard useQuery hook but with enhanced options
  const result = useReactQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
    retry: (failureCount, error) => {
      // Don't retry on AbortError - these are expected during unmounting
      if (isAbortError(error)) {
        return false;
      }
      
      // For other errors, use the provided retry logic or default to none
      if (typeof options.retry === 'function') {
        // Make sure the return value is always boolean
        const retryResult = options.retry(failureCount, error as TError);
        return Boolean(retryResult);
      }
      
      return Boolean(options.retry ?? false);
    },
    // Override the query function to add our AbortController signal
    queryFn: async (context) => {
      // If we don't have a query function, throw an error
      if (!options.queryFn) {
        throw new Error('Query function is required for useSafeQuery');
      }
      
      try {
        // Use our AbortController's signal
        if (queryRef.current) {
          // Combine the existing signal with our component-level signal
          context.signal = queryRef.current.signal;
        }
        
        // Call the original query function
        // Ensure options.queryFn is callable before invoking it
        if (typeof options.queryFn === 'function') {
          const result = await options.queryFn(context);
          return result;
        }
        
        // Fallback if queryFn is somehow not a function
        throw new Error('Query function is required and must be callable');
      } catch (error) {
        // Handle AbortError specially
        if (isAbortError(error)) {
          console.debug(`Query was aborted (expected): ${context.queryKey}`);
          // Return an empty result instead of throwing
          return {} as TQueryFnData;
        }
        throw error;
      }
    }
  });
  
  return result;
}

/**
 * A wrapper around useMutation that provides enhanced error handling
 * 
 * @param options Options object passed to useMutation
 * @returns The result from useMutation with additional error handling
 */
export function useSafeMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  options: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationClient'>
) {
  const queryClient = useQueryClient();
  
  // Use the standard useMutation hook but with enhanced options
  const result = useReactMutation<TData, TError, TVariables, TContext>({
    ...options,
    // Handle AbortError specially in onError
    onError: (error, variables, context) => {
      // Don't call the original onError for AbortError
      if (isAbortError(error)) {
        console.debug('Mutation was aborted (expected)');
        return;
      }
      
      // For other errors, call the original onError handler
      if (options.onError) {
        options.onError(error, variables, context);
      }
    }
  });
  
  return result;
}