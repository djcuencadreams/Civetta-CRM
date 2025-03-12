import React, { useState } from 'react';
import { useQuery } from '@/lib/queryClient';
import { captureError as logError } from '@/lib/error-handling/monitoring';
import { withErrorBoundary } from '@/components/error-boundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ServerStatusIndicator } from '@/components/ServerHealth';

// Sample component with error handling
function ReportsSimplePage() {
  const [triggerError, setTriggerError] = useState(false);

  // Query to fetch customers for reports
  const { data: customers = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    throwOnError: triggerError, // Only throw errors when testing error boundary
  });

  // Force an error in the component to demonstrate error boundary
  const causeComponentError = () => {
    try {
      // Intentionally cause a type error
      const nullObject: any = null;
      nullObject.nonExistentMethod();
    } catch (err) {
      // Log the error before re-throwing it
      logError(err, { source: 'Reports Demo', component: 'ReportsSimplePage' });
      throw err;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <CardHeader className="px-0">
          <CardTitle>Simple Reports</CardTitle>
          <CardDescription>Loading customer data...</CardDescription>
        </CardHeader>
        
        <div className="space-y-4 mt-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state (only shown if not throwing errors)
  if (error && !triggerError) {
    return (
      <div className="p-6">
        <CardHeader className="px-0">
          <CardTitle>Simple Reports</CardTitle>
          <CardDescription className="text-red-500">
            Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
        
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Simple Reports</h1>
          <p className="text-muted-foreground">Demonstrating error handling features</p>
        </div>
        <ServerStatusIndicator />
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Customer Summary</CardTitle>
            <CardDescription>
              Overview of all customers in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{customers?.length || 0} Total Customers</p>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>API Error Test</CardTitle>
              <CardDescription>
                Test how the UI handles API errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Click the button below to test error handling of API errors:</p>
              <Button 
                variant="outline" 
                onClick={() => setTriggerError(!triggerError)}
              >
                {triggerError ? 'Disable' : 'Enable'} API Error Throwing
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Component Error Test</CardTitle>
              <CardDescription>
                Test how the Error Boundary catches component errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Click the button below to simulate a component error:</p>
              <Button 
                variant="destructive"
                onClick={causeComponentError}
              >
                Trigger Component Error
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Export with error boundary wrapper
export default withErrorBoundary(ReportsSimplePage);