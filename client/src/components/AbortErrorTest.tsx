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
          description: 'AbortError successfully triggered and handled locally!',
        });
        console.log('✅ AbortError correctly thrown and caught locally:', error.message);
        
        // Now let's verify our global handler is also working for unhandled AbortErrors
        // This simulates a navigation abort that isn't caught locally
        setTimeout(() => {
          const controller = new AbortController();
          fetch('/api/customers', { signal: controller.signal });
          controller.abort();
          // We don't catch this one, it should be handled by our global handler
          // and NOT show an error overlay
        }, 500);
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

  // Helper to retrieve error handler stats
  const getErrorStats = () => {
    if (typeof window !== 'undefined' && (window as any).getErrorHandlerStats) {
      try {
        const stats = (window as any).getErrorHandlerStats();
        toast({
          title: 'Error Handler Stats',
          description: `Abort errors: ${stats.abortErrorsHandled} | Runtime errors: ${stats.runtimeErrorsHandled} | Unhandled rejections: ${stats.unhandledRejectionsHandled}`,
        });
        console.log('Current error handler stats:', stats);
      } catch (e) {
        console.error('Failed to get error stats:', e);
      }
    } else {
      toast({
        title: 'Stats Unavailable',
        description: 'Error handler stats not available',
        variant: 'destructive',
      });
    }
  };
  
  // Run all verification tests at once
  const runVerification = async () => {
    setLoading(true);
    toast({
      title: 'Starting Verification',
      description: 'Running all verification tests in sequence...',
    });
    
    // Test 1: Local abort handling
    try {
      const controller = new AbortController();
      const fetchPromise = fetch('/api/customers', { signal: controller.signal });
      controller.abort();
      await fetchPromise;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('✅ Local abort handling verified');
      }
    }
    
    // Test 2: Global abort handling (unhandled)
    setTimeout(() => {
      const controller = new AbortController();
      fetch('/api/customers', { signal: controller.signal });
      controller.abort();
      console.log('✅ Global abort handling triggered');
    }, 200);
    
    // Test 3: Genuine error handling
    setTimeout(() => {
      try {
        fetch('/api/test-error').catch(e => {
          console.log('✅ Server error correctly received:', e.message);
        });
      } catch (e) {
        console.error('Error during test:', e);
      }
    }, 400);
    
    // Test 4: Unhandled promise rejection
    setTimeout(() => {
      new Promise((_, reject) => {
        reject(new Error('Test unhandled rejection for verification'));
      });
      console.log('✅ Unhandled rejection triggered for global handler');
    }, 600);
    
    // Check stats after tests
    setTimeout(() => {
      getErrorStats();
      setLoading(false);
    }, 1000);
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
      
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-4">
        <Button 
          onClick={runVerification} 
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? 'Verifying...' : 'Run Full Verification'}
        </Button>
        
        <Button 
          onClick={getErrorStats} 
          variant="outline"
          disabled={loading}
          className="w-full md:w-auto"
        >
          Get Error Stats
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground mt-2">
        Note: Check the browser console to see the detailed handling of these errors.
        The verification tests will run all test scenarios in sequence and report results.
      </div>
    </div>
  );
}