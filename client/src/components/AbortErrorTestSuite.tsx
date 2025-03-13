import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckIcon } from '@radix-ui/react-icons';
import { AlertCircle as AlertCircleIcon } from 'lucide-react';
import { useSafeAbort, useSafeSignal } from '@/hooks/use-safe-abort';
import { createSafeAbortController } from '@/lib/queryClient';

/**
 * Test suite for abort error handling
 * This component tests the improved error handling fixes we've implemented
 */
export function AbortErrorTestSuite() {
  const [results, setResults] = useState<{test: string; result: 'success' | 'failure'; message: string}[]>([]);
  const controller = useSafeAbort('Test abort suite');
  
  // Helper to log test results
  const logResult = (test: string, result: 'success' | 'failure', message: string) => {
    setResults(prev => [...prev, { test, result, message }]);
  };
  
  // Run test case 1: Safe abort controller with reason
  const testSafeAbortController = async () => {
    try {
      const controller = createSafeAbortController('Test reason');
      
      // Start a promise that will be aborted
      const testPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve('This should never resolve');
        }, 1000);
      });
      
      // Create a fetch request that will be aborted
      const fetchPromise = fetch('/api/deliberately-slow-endpoint', { 
        signal: controller.signal 
      });
      
      // Abort the controller with a reason
      controller.abort(new DOMException('Explicit abort reason', 'AbortError'));
      
      // Try to catch the aborted fetch
      try {
        await fetchPromise;
        logResult('Safe Abort Controller', 'failure', 'Fetch completed but should have been aborted');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          logResult('Safe Abort Controller', 'success', 'Fetch aborted with proper AbortError: ' + error.message);
        } else {
          logResult('Safe Abort Controller', 'failure', `Wrong error type: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      logResult('Safe Abort Controller', 'failure', `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Run test case 2: UseSafeSignal hook error handling
  const testSafeSignalHook = () => {
    try {
      const { signal, abort } = useSafeSignal('Testing safe signal abort');
      
      // Start a fetch that will be aborted
      const fetchWithPromiseCatch = async () => {
        try {
          const response = await fetch('/api/deliberately-slow-endpoint', { signal });
          return response.json();
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            logResult('Safe Signal Hook', 'success', 'Hook correctly created AbortError with reason: ' + error.message);
          } else {
            logResult('Safe Signal Hook', 'failure', `Wrong error from fetch: ${error instanceof Error ? error.message : String(error)}`);
          }
          
          throw error; // Re-throw to test outer catch
        }
      };
      
      // Start the fetch then abort it
      const promise = fetchWithPromiseCatch();
      abort('User-initiated abort from test');
      
      // Add outer catch as a backup
      promise.catch(error => {
        // We expect this error and already logged it in the inner catch
        console.debug('Caught expected abort error in outer catch:', error.message);
      });
      
    } catch (error) {
      logResult('Safe Signal Hook', 'failure', `Unexpected exception: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Run test case 3: Proper error propagation in promises
  const testErrorPropagation = async () => {
    try {
      const controller = createSafeAbortController('Testing error propagation');
      
      // Create a chain of promises
      const fetchChain = async () => {
        const response = await fetch('/api/deliberately-slow-endpoint', {
          signal: controller.signal
        });
        const data = await response.json();
        return data;
      };
      
      // Start the chain
      const promise = fetchChain();
      
      // Abort right away
      controller.abort(new DOMException('Intentional abort during promise chain', 'AbortError'));
      
      // Let's see if the error propagates correctly
      try {
        await promise;
        logResult('Error Propagation', 'failure', 'Chain completed but should have been aborted');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          logResult('Error Propagation', 'success', 'Error correctly propagated through promise chain: ' + error.message);
        } else {
          logResult('Error Propagation', 'failure', `Wrong error type in chain: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      logResult('Error Propagation', 'failure', `Unexpected outer error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Run all tests
  const runAllTests = async () => {
    setResults([]);
    
    // Run tests sequentially
    await testSafeAbortController();
    testSafeSignalHook();
    await testErrorPropagation();
    
    // Final assessment
    const failures = results.filter(r => r.result === 'failure').length;
    if (failures === 0) {
      logResult('Overall Assessment', 'success', 'All tests passed! The abort error handling is working correctly.');
    } else {
      logResult('Overall Assessment', 'failure', `${failures} test(s) failed. Check the details above.`);
    }
  };
  
  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AbortError Handling Test Suite</h2>
        <Button onClick={runAllTests} className="ml-auto">
          Run All Tests
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            Click "Run All Tests" to evaluate the abort error handling.
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <Alert
                key={index}
                variant={result.result === 'success' ? 'default' : 'destructive'}
                className={result.result === 'success' ? 'border-green-500 bg-green-50' : ''}
              >
                <div className="flex items-start">
                  <div className="mr-2 mt-0.5">
                    {result.result === 'success' ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <AlertTitle>{result.test}</AlertTitle>
                    <AlertDescription className="text-sm">
                      {result.message}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default AbortErrorTestSuite;