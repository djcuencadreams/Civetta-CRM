/**
 * Navigation utilities for handling route changes and cleanup
 */
import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { queryClient } from './queryClient'

/**
 * Custom hook that cancels in-flight requests when route changes
 * This helps prevent AbortError messages when navigating between pages
 */
export function useNavigationCleanup(): void {
  const [location] = useLocation()
  
  useEffect(() => {
    // When location changes, cancel all in-flight requests
    console.debug('Route changed, canceling in-flight requests')
    queryClient.cancelQueries()
  }, [location])
}