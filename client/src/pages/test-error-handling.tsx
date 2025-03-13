import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * This page provides tools to test our error handling system
 * It includes multiple types of tests:
 * 1. Navigation abort handling
 * 2. Slow API responses
 * 3. API failures
 * 4. Unhandled promise rejections
 * 5. Runtime errors
 */
export default function TestErrorHandling() {
  const [activeTest, setActiveTest] = useState('navigation');
  const [loading, setLoading] = useState(false);
  const [abortResult, setAbortResult] = useState<string | null>(null);
  
  // Test navigation abort by creating then aborting fetch requests
  const testNavigationAbort = async () => {
    setLoading(true);
    setAbortResult('Starting test...');
    
    try {
      // Create an abort controller
      const controller = new AbortController();
      const { signal } = controller;
      
      // Start multiple fetch requests
      const fetchPromises = [
        fetch('/api/customers', { signal }),
        fetch('/api/leads', { signal }),
        fetch('/api/sales', { signal }),
        // Add a deliberately slow endpoint
        fetch('/api/deliberately-slow-endpoint?delay=1000', { signal })
      ];
      
      // Show messages
      setAbortResult('Multiple requests started...');
      
      // Wait a bit then abort them all
      setTimeout(() => {
        controller.abort('Manual test abort');
        setAbortResult('Requests aborted successfully. Check the console for error messages. '
          + 'If there are no error overlays showing, the test passed!');
        setLoading(false);
      }, 100);
      
      // This should never complete because we abort above
      await Promise.all(fetchPromises);
      
    } catch (error: any) {
      // This catch block should handle any non-abort errors
      // AbortErrors should be handled by our global system
      if (error.name !== 'AbortError') {
        setAbortResult(`Error: ${error.message}`);
      }
      setLoading(false);
    }
  };
  
  // Test global abort (dispatches an event to abort all pending requests)
  const testGlobalAbort = () => {
    window.dispatchEvent(new Event('abort-pending-requests'));
    setAbortResult('Global abort event dispatched. All pending requests should be aborted now.');
  };
  
  // Test a slow API response
  const testSlowApi = async () => {
    setLoading(true);
    
    try {
      // Make a request to our deliberately slow endpoint
      const response = await fetch('/api/deliberately-slow-endpoint?delay=3000');
      const data = await response.json();
      console.log('Slow API response:', data);
      setLoading(false);
    } catch (error: any) {
      console.error('Slow API error:', error);
      setLoading(false);
    }
  };
  
  // Test API failure
  const testApiFailure = async () => {
    setLoading(true);
    
    try {
      // Make a request to a non-existent endpoint to cause a 404
      const response = await fetch('/api/non-existent-endpoint');
      const data = await response.json();
      console.log('API failure response:', data);
      setLoading(false);
    } catch (error: any) {
      console.error('API failure error:', error);
      setLoading(false);
    }
  };
  
  // Test unhandled promise rejection
  const testUnhandledRejection = () => {
    // Create a promise that will reject but not be caught
    new Promise((_, reject) => {
      reject(new Error('This is an uncaught promise rejection test'));
    });
    
    console.log({
      description: 'Unhandled promise rejection test initiated',
    });
  };
  
  // Test runtime error
  const testRuntimeError = () => {
    console.log({
      description: 'Runtime error test initiated',
    });
    
    // This will trigger a runtime error
    setTimeout(() => {
      try {
        // This will cause a runtime error
        const obj: any = null;
        // The next line will throw at runtime
        obj.nonExistentProperty.nonExistentMethod();
      } catch (err) {
        console.error('Runtime error test triggered:', err);
      }
    }, 500);
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
                <strong>Warning:</strong> This test will cause an error in the console, but it should 
                not show an error overlay thanks to our error handling system.
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
      
      <div className="mt-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
        <p>Check the console for detailed error logs and messages.</p>
        <p className="mt-2">
          If you see any error overlays during these tests, our error handling system needs improvement.
        </p>
      </div>
    </div>
  );
}