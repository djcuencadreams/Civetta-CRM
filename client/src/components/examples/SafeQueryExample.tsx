/**
 * Example component demonstrating how to use the safe query hooks
 * 
 * This component shows proper error handling with abort controllers and
 * TanStack Query to prevent "unhandled promise rejection" errors during
 * navigation or component unmount.
 */
import React, { useState } from 'react';
import { useSafeQuery, useSafeMutation } from '@/hooks/use-safe-query';
import { useSafeAbort, useSafeSignal, useSafeFetch } from '@/hooks/use-safe-abort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

/**
 * Example component showing how to use our safe query hooks
 */
export function SafeQueryExample() {
  // Example 1: Using the safe query hook
  const customersQuery = useSafeQuery({
    queryKey: ['/api/customers'],
    // This query will be automatically aborted if the component unmounts
    // and will not cause "unhandled promise rejection" errors
  });
  
  // Example 2: Using the safe mutation hook
  const createCustomerMutation = useSafeMutation({
    mutationFn: (customerData: any) => {
      return apiRequest({
        method: 'POST',
        url: '/api/customers',
        body: customerData
      });
    },
    // This mutation will be safely aborted if the component unmounts
  });
  
  // Example 3: Using the safe abort controller directly
  const controller = useSafeAbort('Manual data fetching example');
  
  // Example 4: Using just the signal for fetch operations
  const signal = useSafeSignal('Optional fetch operations');
  
  // Example 5: Using the safe fetch wrapper
  const safeFetch = useSafeFetch('Custom fetch example');
  
  // Example function showing how to use the abort controller
  const fetchDataManually = async () => {
    try {
      // The controller will be auto-aborted when component unmounts
      const response = await fetch('/api/some-endpoint', {
        signal: controller.signal
      });
      
      // Process response
      const data = await response.json();
      console.log('Fetched data:', data);
    } catch (error) {
      // Safe error handling that won't break during navigation
      if ((error as any)?.name === 'AbortError') {
        console.log('Fetch was aborted safely');
        return; // Just return, don't throw or show errors for aborts
      }
      
      // Handle other errors normally
      console.error('Error fetching data:', error);
    }
  };
  
  // Example function showing how to use the safe fetch wrapper
  const fetchWithSafeWrapper = async () => {
    // The safeFetch function automatically handles abort errors
    const response = await safeFetch('/api/some-endpoint');
    
    // Check if the response was from an aborted request
    if (response.status === 499) {
      console.log('Request was aborted, handling gracefully');
      return;
    }
    
    // Process normal response
    const data = await response.json();
    console.log('Fetched data:', data);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Safe Query Usage Examples</CardTitle>
        <CardDescription>
          Demonstration of proper error handling techniques that prevent unhandled promise rejections
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Example 1: Safe Query</h3>
          <div className="mt-2">
            {customersQuery.isLoading ? (
              <p>Loading customers...</p>
            ) : customersQuery.isError ? (
              <p className="text-red-500">
                Error loading customers: {(customersQuery.error as Error)?.message || 'Unknown error'}
              </p>
            ) : (
              <p>Loaded {Array.isArray(customersQuery.data) ? customersQuery.data.length : 0} customers</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Example 2: Safe Mutation</h3>
          <div className="mt-2">
            <Button 
              onClick={() => createCustomerMutation.mutate({ name: 'Test Customer', email: 'test@example.com' })}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? 'Creating...' : 'Create Test Customer'}
            </Button>
            
            {createCustomerMutation.isError && (
              <p className="text-red-500 mt-2">
                Error: {(createCustomerMutation.error as Error)?.message || 'Unknown error'}
              </p>
            )}
            
            {createCustomerMutation.isSuccess && (
              <p className="text-green-500 mt-2">Customer created successfully!</p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchDataManually}>
          Manual Fetch Example
        </Button>
        <Button variant="outline" onClick={fetchWithSafeWrapper}>
          Safe Fetch Example
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SafeQueryExample;