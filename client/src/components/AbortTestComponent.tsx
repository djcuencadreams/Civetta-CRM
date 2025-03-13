import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * AbortController Test Component
 * 
 * This component demonstrates proper handling of AbortController errors, 
 * focusing on handling them correctly rather than suppressing error messages.
 */
export default function AbortTestComponent() {
  const [testResult, setTestResult] = useState<string>('');
  const [errorShown, setErrorShown] = useState<boolean>(false);
  
  // Test that aborts during component unmount are properly handled
  useEffect(() => {
    // Create the controller with a reason to make debugging easier
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Track if the component is mounted
    let isMounted = true;
    
    // Proper async function with proper error handling
    const fetchData = async () => {
      try {
        // Intentionally slow fetch that will be aborted on unmount
        const response = await fetch('/api/deliberately-slow-endpoint', { signal });
        // Only process response if component is still mounted
        if (isMounted) {
          const data = await response.json();
          setTestResult('This should never be shown as the request will be aborted');
        }
      } catch (error) {
        // Don't do anything if component unmounted
        if (!isMounted) return;
        
        // This is expected when component unmounts - handle properly
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Expected AbortError on unmount (this is normal):', error.message);
        } else {
          console.error('Unexpected error:', error);
        }
      }
    };
    
    // Start fetch but properly catch any errors that might escape
    fetchData().catch(err => {
      if (isMounted) {
        console.log('Caught error in outer catch handler:', err);
      }
    });
      
    // Cleanup function that aborts the request when component unmounts
    return () => {
      isMounted = false;
      
      // Safely abort with reason
      if (!controller.signal.aborted) {
        try {
          controller.abort(new DOMException('Component unmounted', 'AbortError'));
          console.log('Safely aborted fetch on component unmount');
        } catch (err) {
          // Just log any errors, don't rethrow
          console.error('Error during cleanup abort:', err);
        }
      }
    };
  }, []);
  
  // Function to manually test abort behavior with proper error handling
  const testManualAbort = () => {
    setTestResult('Testing manual abort (properly handled)...');
    
    // Create controller with reason
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Use async/await with proper try/catch for better error handling
    const runTest = async () => {
      try {
        // Start a fetch
        const response = await fetch('/api/deliberately-slow-endpoint', { signal });
        const data = await response.json();
        setTestResult('This should never be shown as the request will be aborted');
      } catch (error) {
        // Properly detect and handle abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          setTestResult('✅ AbortError handled correctly through proper try/catch');
        } else {
          setTestResult(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    
    // Start the test and ensure we catch any escaping errors
    runTest().catch(error => {
      setTestResult(`Caught in outer handler: ${error instanceof Error ? error.message : String(error)}`);
    });
    
    // Abort after a short delay with proper reason
    setTimeout(() => {
      try {
        controller.abort(new DOMException('Test abort with reason', 'AbortError'));
        console.log('Manually aborted fetch request with proper reason');
      } catch (err) {
        console.error('Error during abort:', err);
      }
    }, 50);
  };

  // Test handled promise rejection with AbortError
  const testHandledRejection = () => {
    setTestResult('Testing proper rejection handling...');
    
    // Create a Promise that properly handles the rejection
    const testPromise = new Promise((resolve, reject) => {
      const controller = new AbortController();
      
      // Create a proper abort with reason
      controller.abort(new DOMException('Test abort for rejection example', 'AbortError'));
      
      // Reject with a proper DOMException with reason
      reject(new DOMException('Test rejection properly handled', 'AbortError'));
    });
    
    // Properly handle the rejection
    testPromise.catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setTestResult('✅ Properly handled AbortError rejection with explicit catch');
        console.log('Successfully caught AbortError:', error.message);
      } else {
        setTestResult(`❌ Unexpected error type: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    setErrorShown(true);
  };
  
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-xl font-bold">AbortController Error Test</h2>
      <p>This component demonstrates proper handling of AbortErrors (not just suppressing them).</p>
      
      <div className="space-y-2">
        <Button onClick={testManualAbort} variant="outline">
          Test Proper Abort Handling
        </Button>
        
        <Button 
          onClick={testHandledRejection} 
          variant="outline"
          className="ml-2"
          disabled={errorShown}
        >
          Test Proper Rejection Handling
        </Button>
      </div>
      
      {testResult && (
        <div className="mt-4 p-3 bg-slate-100 rounded text-sm">
          {testResult}
        </div>
      )}
    </Card>
  );
}