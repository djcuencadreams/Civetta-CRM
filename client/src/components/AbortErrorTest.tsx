/**
 * Component for testing the global error handler's ability to
 * correctly handle abort signals from fetch requests
 */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function AbortErrorTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Function to test abort error handling
  const testAbortSignal = async () => {
    setLoading(true);
    try {
      // Create an abort controller
      const controller = new AbortController();
      const { signal } = controller;
      
      // Start a fetch request
      const fetchPromise = fetch('/api/customers', { signal });
      
      // Immediately abort the request to trigger an AbortError
      controller.abort();
      
      // Wait for the fetch to be rejected
      await fetchPromise;
      
      // This should never execute because the fetch should be aborted
      toast({
        title: 'Error',
        description: 'The fetch should have been aborted!',
        variant: 'destructive',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // This is expected - the AbortError should be caught here and not bubble up to the global handler
        toast({
          title: 'Success',
          description: 'AbortError successfully triggered and handled!',
        });
        console.log('✅ AbortError correctly thrown and caught:', error.message);
      } else {
        // This is unexpected - we should only get AbortError
        toast({
          title: 'Unexpected Error',
          description: `Expected AbortError but got: ${error.message}`,
          variant: 'destructive',
        });
        console.error('❌ Expected AbortError but got:', error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test the error endpoint
  const testErrorEndpoint = async () => {
    setLoading(true);
    try {
      // Call an endpoint that deliberately throws an error
      const response = await fetch('/api/test-error');
      
      // If we get here, the endpoint didn't throw an error as expected
      toast({
        title: 'Unexpected Success',
        description: 'Error endpoint should have thrown an error!',
        variant: 'destructive',
      });
    } catch (error: any) {
      // This is expected - the error endpoint should throw
      toast({
        title: 'Success',
        description: 'Error endpoint correctly triggered an error!',
      });
      console.log('✅ Error endpoint correctly triggered:', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test unhandled promise rejection
  const testUnhandledRejection = () => {
    setLoading(true);
    
    // Create a promise that will be rejected but not caught
    // This should be caught by our global error handler
    setTimeout(() => {
      new Promise((_, reject) => {
        reject(new Error('Test unhandled rejection'));
      });
      
      toast({
        title: 'Test Running',
        description: 'Unhandled rejection triggered. Check the console for results.',
      });
      
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Error Handling Tests</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-2">Test Abort Signal Handling</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Tests the handling of AbortController signals in fetch requests.
          </p>
          <Button 
            onClick={testAbortSignal} 
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </Button>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium mb-2">Test Error Endpoint</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Tests the error handling of API endpoints that throw errors.
          </p>
          <Button 
            onClick={testErrorEndpoint} 
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </Button>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium mb-2">Test Unhandled Rejection</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Tests the global handling of unhandled promise rejections.
          </p>
          <Button 
            onClick={testUnhandledRejection} 
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </Button>
        </Card>
      </div>
      
      <div className="text-sm text-muted-foreground mt-2">
        Note: Check the browser console to see the detailed handling of these errors.
      </div>
    </div>
  );
}