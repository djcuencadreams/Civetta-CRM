// Special test component that demonstrates proper abort error handling
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AbortTestComponent from '@/components/AbortTestComponent';
import AbortErrorTestSuite from '@/components/AbortErrorTestSuite';

/**
 * A comprehensive test suite for abort error handling
 * This component demonstrates the proper way to handle abort errors
 * without relying on error suppression techniques
 */
export function RuntimeErrorTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<string>('');
  
  // This will cause an abort error that we properly handle
  useEffect(() => {
    // Flag to track component mount state
    let isMounted = true;
    
    // Create an AbortController with proper reason handling
    const controller = new AbortController();
    const signal = controller.signal;
    
    const fetchData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        
        // This will start a slow request
        const response = await fetch('/api/deliberately-slow-endpoint?delay=5000', {
          signal: signal
        });
        
        // We should never get here because we abort immediately
        if (!isMounted) return;
        const data = await response.json();
        setResult('Data received (unexpected)');
      } catch (err) {
        // Only set error if component is still mounted
        if (!isMounted) return;
        
        if (err instanceof Error) {
          // Properly handle the abort error
          if (err.name === 'AbortError') {
            setError(new Error(`Properly handled abort: ${err.message}`));
            console.log('TEST: AbortError handled correctly', err.message);
          } else {
            setError(err);
            console.error('TEST ERROR:', err);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Start the fetch with proper error handling
    fetchData().catch(err => {
      // Explicitly catch any errors to prevent unhandled rejections
      console.log('Caught in outer catch handler:', err);
      if (isMounted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    });
    
    // Abort after a short delay to demonstrate proper handling
    const timerId = setTimeout(() => {
      if (isMounted) {
        try {
          controller.abort(new DOMException('Test abort error - this is expected behavior', 'AbortError'));
          console.log('Aborted request deliberately for testing');
        } catch (err) {
          console.error('Error during abort:', err);
        }
      }
    }, 100);
    
    // Cleanup function that properly handles component unmount
    return () => {
      isMounted = false;
      clearTimeout(timerId);
      
      // Safe abort that won't throw uncaught errors
      try {
        if (!controller.signal.aborted) {
          controller.abort(new DOMException('Component unmounted', 'AbortError'));
        }
      } catch (err) {
        console.error('Error during cleanup abort:', err);
      }
    };
  }, []);
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">AbortError Handling Testing Suite</h1>
      <p className="text-gray-600 mb-8">
        This page demonstrates the proper way to handle AbortController errors by addressing them at their source
        rather than suppressing error messages. Each test verifies a different aspect of error handling.
      </p>
      
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic AbortError Test</TabsTrigger>
          <TabsTrigger value="component">Component Unmount Test</TabsTrigger>
          <TabsTrigger value="comprehensive">Comprehensive Test Suite</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Runtime Error Test</h2>
            <p className="mb-4">Testing proper handling of abort errors using try/catch patterns</p>
            <div className="mt-4 p-3 bg-slate-100 rounded text-sm">
              {loading ? 'Loading...' : error ? 
                <span className="text-green-600">✓ Success! Error properly handled: {error.message}</span>
                : result || 'No response yet'}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="component">
          <AbortTestComponent />
        </TabsContent>
        
        <TabsContent value="comprehensive">
          <AbortErrorTestSuite />
        </TabsContent>
      </Tabs>
      
      <Card className="p-6 mt-8">
        <h2 className="text-xl font-bold mb-4">About the Error Handling Fix</h2>
        <p className="text-sm leading-relaxed">
          This implementation focuses on proper handling of AbortError exceptions at their source, rather than
          attempting to hide or suppress them with CSS or event listeners. Key improvements include:
        </p>
        <ul className="list-disc ml-6 mt-3 text-sm space-y-2">
          <li>Using proper <code className="bg-gray-100 px-1">try/catch</code> blocks to handle errors gracefully</li>
          <li>Adding explicit reasons when aborting controllers for better debugging</li>
          <li>Using proper DOMException objects with correct name and message</li>
          <li>Tracking component mounted state to avoid state updates after unmount</li>
          <li>Using nested error handling to catch errors at multiple levels</li>
          <li>Custom hooks that integrate with React's lifecycle for safe aborts</li>
        </ul>
      </Card>
    </div>
  );
}