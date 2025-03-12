/**
 * Custom hook for safe queries with improved error handling
 * This hook wraps TanStack Query's useQuery with additional error handling
 */
import { useState, useEffect } from 'react';
import { useQuery, UseQueryResult, QueryKey, UseQueryOptions } from '@tanstack/react-query';
import { captureError } from '@/lib/error-handling/monitoring';
import { toast } from '@/hooks/use-toast';

/**
 * Type for the error state with additional context
 */
export interface EnhancedErrorState {
  message: string;
  errorId?: string;
  statusCode?: number;
  timestamp: Date;
  queryKey: QueryKey;
  details?: unknown;
}

/**
 * Hook options extending TanStack Query options
 */
export interface UseSafeQueryOptions<TData, TError>
  extends Omit<UseQueryOptions<TData, TError, TData>, 'queryKey'> {
  /**
   * Whether to show toast notifications on error
   */
  showErrorToast?: boolean;
  
  /**
   * Custom error message to display
   */
  errorMessage?: string;
  
  /**
   * Whether to capture the error in monitoring system
   */
  captureInMonitoring?: boolean;
}

/**
 * Safely executes a query with enhanced error handling
 * 
 * @param queryKey - The query key for cache management
 * @param options - Query options including error handling settings
 * @returns Query result and enhanced error state
 */
export function useSafeQuery<TData, TError = Error>(
  queryKey: QueryKey,
  options?: UseSafeQueryOptions<TData, TError>
): [UseQueryResult<TData, TError>, EnhancedErrorState | null] {
  // Default options
  const {
    showErrorToast = true,
    errorMessage = 'Failed to load data',
    captureInMonitoring = true,
    ...queryOptions
  } = options || {};
  
  // Enhanced error state
  const [errorState, setErrorState] = useState<EnhancedErrorState | null>(null);
  
  // Use TanStack Query
  const queryResult = useQuery<TData, TError, TData>({
    queryKey,
    ...queryOptions
  });
  
  // Handle errors
  useEffect(() => {
    if (queryResult.error) {
      // Extract error details
      const error = queryResult.error as any;
      
      // Create enhanced error state
      const enhancedError: EnhancedErrorState = {
        message: error?.message || errorMessage,
        errorId: error?.errorId || undefined,
        statusCode: error?.statusCode || error?.response?.status,
        timestamp: new Date(),
        queryKey,
        details: error
      };
      
      // Update error state
      setErrorState(enhancedError);
      
      // Show toast notification if enabled
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: enhancedError.message,
          variant: 'destructive',
        });
      }
      
      // Capture in monitoring system if enabled
      if (captureInMonitoring) {
        captureError(error, {
          source: 'useSafeQuery',
          queryKey: queryKey.join('.'),
          operation: 'query'
        });
      }
    } else {
      // Clear error state on success
      setErrorState(null);
    }
  }, [queryResult.error, errorMessage, showErrorToast, captureInMonitoring, queryKey]);
  
  return [queryResult, errorState];
}

/**
 * Alternative hook with object return style for destructuring
 */
export function useSafeQueryObj<TData, TError = Error>(
  queryKey: QueryKey,
  options?: UseSafeQueryOptions<TData, TError>
): UseQueryResult<TData, TError> & { 
  enhancedError: EnhancedErrorState | null 
} {
  const [query, enhancedError] = useSafeQuery(queryKey, options);
  return { ...query, enhancedError };
}