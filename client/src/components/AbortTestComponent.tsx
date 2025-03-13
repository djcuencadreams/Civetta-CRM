import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, AlertCircleIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

/**
 * Test component specifically for verifying our abort error handling fixes
 * This component will:
 * 1. Start a slow fetch that we can manually abort
 * 2. Navigate away during a fetch to trigger unmount abort errors
 * 3. Provide buttons to test different abort error scenarios
 */
export default function AbortTestComponent() {
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Test the deliberately slow endpoint
  const testSlowEndpoint = async (delay: number = 3000) => {
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      setTestStatus('loading');
      setTestMessage(`Testing endpoint with ${delay}ms delay...`);
      
      // Start the fetch with our abort controller
      const response = await fetch(`/api/deliberately-slow-endpoint?delay=${delay}`, {
        signal: controller.signal
      });
      
      if (response.ok) {
        setTestStatus('success');
        setTestMessage('Request completed successfully!');
      } else {
        setTestStatus('error');
        setTestMessage(`Request failed with status: ${response.status}`);
      }
    } catch (error: any) {
      // Handle the error - this should be suppressed by our patches if it's an abort
      setTestStatus('error');
      setTestMessage(`Error: ${error.message || 'Unknown error'}`);
      
      // Log it for our debug info
      console.debug('Test request error (should be handled):', error);
    } finally {
      setAbortController(null);
    }
  };
  
  // Manually abort the current request
  const abortCurrentRequest = () => {
    if (abortController) {
      abortController.abort('Manual abort test');
      setTestStatus('idle');
      setTestMessage('Request aborted manually');
    } else {
      setTestMessage('No active request to abort');
    }
  };
  
  // Create an auto-abort test
  const testAutoAbort = () => {
    // Start a fetch that we'll abort after a short delay
    testSlowEndpoint(5000);
    
    // Set a timeout to abort it after 1 second
    setTimeout(() => {
      if (abortController) {
        abortController.abort('Auto-abort test');
        setTestStatus('idle');
        setTestMessage('Request auto-aborted after 1 second');
      }
    }, 1000);
  };
  
  // Create an unmount test - this is what typically triggers the error
  const testUnmountAbort = () => {
    // Start a slow request
    testSlowEndpoint(10000);
    
    // After a short delay, "unmount" this component by clearing any active controller
    // This simulates what happens during navigation when components unmount
    setTimeout(() => {
      setAbortController(prev => {
        if (prev) {
          prev.abort('Component unmount simulation');
          setTestStatus('idle');
          setTestMessage('Simulated unmount abort');
        }
        return null;
      });
    }, 1000);
  };
  
  // Create an error that includes the specific text "signal is aborted without reason"
  const testSpecificErrorText = () => {
    // Directly create and handle an error with the exact same text as the Vite plugin error
    const error = new DOMException("signal is aborted without reason", "AbortError");
    console.error(error);
    
    // Also create a promise rejection with the same error
    Promise.reject(error);
    
    setTestMessage('Created test error with exact "signal is aborted without reason" text');
  };

  return (
    <Card className="w-full max-w-lg mx-auto my-4">
      <CardHeader>
        <CardTitle>Abort Error Test Panel</CardTitle>
        <CardDescription>
          Test our fixes for the "[plugin:runtime-error-plugin] signal is aborted without reason" error
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant={
          testStatus === 'idle' ? 'default' : 
          testStatus === 'loading' ? 'default' : 
          testStatus === 'success' ? 'default' : 
          'destructive'
        }>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Test Status: {testStatus.toUpperCase()}</AlertTitle>
          <AlertDescription>{testMessage}</AlertDescription>
        </Alert>
        
        <Separator />
        
        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={() => testSlowEndpoint(3000)}
            disabled={testStatus === 'loading'}
            variant="outline"
          >
            Test Slow Endpoint (3s)
          </Button>
          
          <Button 
            onClick={() => testSlowEndpoint(5000)}
            disabled={testStatus === 'loading'}
            variant="outline"
          >
            Test Very Slow Endpoint (5s)
          </Button>
          
          <Button 
            onClick={abortCurrentRequest}
            disabled={!abortController}
            variant="secondary"
          >
            Manually Abort Current Request
          </Button>
          
          <Separator />
          
          <Button 
            onClick={testAutoAbort}
            disabled={testStatus === 'loading'}
            variant="default"
          >
            Test Auto-Abort After 1s
          </Button>
          
          <Button 
            onClick={testUnmountAbort}
            disabled={testStatus === 'loading'}
            variant="default"
          >
            Test Unmount Abort Scenario
          </Button>
          
          <Button 
            onClick={testSpecificErrorText}
            variant="destructive"
          >
            Test Exact Error Text Match
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          This should test our fixes for the runtime error plugin's abort handling
        </div>
      </CardFooter>
    </Card>
  );
}