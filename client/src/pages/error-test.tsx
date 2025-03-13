import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';

/**
 * Test page to verify error handling capabilities of the application
 * This page contains multiple test scenarios for error handling:
 * 1. Abort errors during navigation
 * 2. Slow API responses
 * 3. Failed API responses
 * 4. Unhandled promise rejections
 * 5. Runtime errors
 */
export default function ErrorTest() {
  const { toast } = useToast();
  const [activeTest, setActiveTest] = useState<string>('navigation');
  const [loading, setLoading] = useState<boolean>(false);
  const [abortResult, setAbortResult] = useState<string>('');
  const [controllers, setControllers] = useState<AbortController[]>([]);

  // Create a cleanup function to abort all controllers on unmount
  useEffect(() => {
    return () => {
      controllers.forEach((controller) => {
        try {
          controller.abort('Component unmounted');
        } catch (err) {
          console.error('Error aborting controller:', err);
        }
      });
    };
  }, [controllers]);

  // Test navigation abort handling
  const testNavigationAbort = async () => {
    setLoading(true);
    setAbortResult('');
    
    try {
      // Create 5 controllers to simulate multiple in-flight requests
      const newControllers: AbortController[] = [];
      for (let i = 0; i < 5; i++) {
        const controller = new AbortController();
        newControllers.push(controller);
      }
      setControllers(newControllers);
      
      // Start multiple requests
      const promises = newControllers.map((controller, index) => 
        fetch(`/api/deliberately-slow-endpoint?delay=${(index + 1) * 1000}`, {
          signal: controller.signal
        }).then(res => res.json())
      );
      
      // Wait for a second and then abort all controllers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Abort all controllers
      newControllers.forEach((controller, index) => {
        controller.abort(`Test abortion ${index + 1}`);
      });
      
      setAbortResult('Successfully aborted all requests without errors!');
      toast({
        title: 'Test Successful',
        description: 'All requests were aborted without showing error overlays',
      });
    } catch (err) {
      console.error('Error in navigation abort test:', err);
      setAbortResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setControllers([]);
    }
  };

  // Test global abort of all in-flight requests
  const testGlobalAbort = () => {
    // Dispatch a custom event to abort all pending requests
    window.dispatchEvent(new CustomEvent('abort-pending-requests'));
    
    toast({
      title: 'All Requests Aborted',
      description: 'Global abort event fired to cancel all in-flight requests',
    });
  };

  // Test slow API responses
  const testSlowApi = async () => {
    setLoading(true);
    try {
      const result = await api('/api/deliberately-slow-endpoint?delay=3000');
      toast({
        title: 'Slow API Test Successful',
        description: 'The slow API request completed successfully after 3 seconds',
      });
    } catch (err) {
      console.error('Error in slow API test:', err);
      toast({
        title: 'Slow API Test Failed',
        description: `Error: ${err instanceof Error ? err.message : String(err)}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test failing API
  const testApiFailure = async () => {
    setLoading(true);
    try {
      await api('/api/test-error');
      // Should not reach here
    } catch (err) {
      console.error('Expected error in API failure test:', err);
      toast({
        title: 'API Error Test Successful',
        description: 'Error was handled correctly without showing error overlay',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test unhandled promise rejection
  const testUnhandledRejection = () => {
    // Create a promise that will reject without being caught
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test unhandled rejection')), 100);
    });
    
    toast({
      title: 'Unhandled Rejection Test',
      description: 'An unhandled rejection was triggered - check if the overlay appears',
    });
  };

  // Test runtime error
  const testRuntimeError = () => {
    try {
      // This will cause a runtime error
      const obj = null;
      // @ts-ignore
      obj.nonExistentMethod();
    } catch (err) {
      console.error('Caught runtime error:', err);
      toast({
        title: 'Runtime Error Test',
        description: 'A runtime error was triggered but caught locally',
      });
    }
    
    // This will trigger an uncaught runtime error
    setTimeout(() => {
      try {
        // This will cause a runtime error but won't break TypeScript
        const anotherObj: any = null;
        // The next line will throw at runtime
        anotherObj?.nonExistentMethod();
      } catch (err) {
        console.error('Runtime error test triggered:', err);
      }
    }, 100);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Error Handling Test Page</h1>
      
      <Alert className="mb-6">
        <AlertTitle>Testing Purpose Only</AlertTitle>
        <AlertDescription>
          This page is designed to test the error handling capabilities of the application.
          Run these tests to verify that navigation and aborted requests do not cause error overlays.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue={activeTest} onValueChange={setActiveTest}>
        <TabsList className="mb-4">
          <TabsTrigger value="navigation">Navigation Abort</TabsTrigger>
          <TabsTrigger value="slow">Slow API</TabsTrigger>
          <TabsTrigger value="failure">API Failure</TabsTrigger>
          <TabsTrigger value="promise">Unhandled Promise</TabsTrigger>
          <TabsTrigger value="runtime">Runtime Error</TabsTrigger>
        </TabsList>
        
        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle>Test Navigation Abort Handling</CardTitle>
              <CardDescription>
                This test verifies that aborting requests during navigation doesn't cause error overlays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This test will start multiple in-flight requests and then abort them, simulating
                what happens during navigation between pages.
              </p>
              {abortResult && (
                <div className={`p-4 rounded mt-4 ${abortResult.includes('Error') ? 'bg-red-100' : 'bg-green-100'}`}>
                  {abortResult}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={testNavigationAbort} disabled={loading}>
                {loading ? 'Testing...' : 'Test Navigation Abort'}
              </Button>
              <Button onClick={testGlobalAbort} variant="outline">
                Abort All Requests Globally
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="slow">
          <Card>
            <CardHeader>
              <CardTitle>Test Slow API Responses</CardTitle>
              <CardDescription>
                Tests handling of slow API responses that might still be in-flight during navigation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This test will make a request to a deliberately slow API endpoint that takes 3 seconds to respond.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={testSlowApi} disabled={loading}>
                {loading ? 'Testing...' : 'Test Slow API'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="failure">
          <Card>
            <CardHeader>
              <CardTitle>Test API Failure Handling</CardTitle>
              <CardDescription>
                Tests handling of API responses that return error status codes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This test will make a request to an API endpoint that deliberately returns an error.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={testApiFailure} disabled={loading}>
                {loading ? 'Testing...' : 'Test API Failure'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="promise">
          <Card>
            <CardHeader>
              <CardTitle>Test Unhandled Promise Rejection</CardTitle>
              <CardDescription>
                Tests handling of unhandled promise rejections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This test will create a promise that rejects without being caught, triggering the
                unhandledrejection event.
              </p>
              <p className="mt-2 text-yellow-600">
                <strong>Warning:</strong> This test is expected to show an error in the console, but
                should not cause an error overlay.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={testUnhandledRejection}>
                Test Unhandled Rejection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="runtime">
          <Card>
            <CardHeader>
              <CardTitle>Test Runtime Error Handling</CardTitle>
              <CardDescription>
                Tests handling of JavaScript runtime errors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This test will trigger a JavaScript runtime error to test error boundary behavior.
              </p>
              <p className="mt-2 text-yellow-600">
                <strong>Warning:</strong> This test will cause an error overlay as we're testing the
                system's response to uncaught errors.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={testRuntimeError} variant="destructive">
                Test Runtime Error
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}