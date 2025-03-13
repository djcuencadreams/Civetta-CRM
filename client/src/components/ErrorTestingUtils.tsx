/**
 * Error Testing Utilities
 * 
 * This component provides various tools to test error handling in the application
 * It can be included in development builds to help diagnose error handling behaviors
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'

/**
 * Test error handling by simulating various error scenarios
 */
export function ErrorTestingPanel() {
  const [activeTab, setActiveTab] = useState('abort-errors')

  // Create a deliberate React Query error with abort
  const [shouldFetch, setShouldFetch] = useState(false)
  const [shouldAutoAbort, setShouldAutoAbort] = useState(false)

  // Test query that will be aborted
  const query = useQuery({
    queryKey: ['error-test-abort'],
    queryFn: async () => {
      // Create abort controller that will abort after 500ms if auto abort is enabled
      const controller = new AbortController()
      const signal = controller.signal
      
      if (shouldAutoAbort) {
        setTimeout(() => {
          controller.abort('Auto abort for testing')
        }, 500)
      }
      
      // Simulate a slow API call
      const response = await fetch('/api/deliberately-slow-endpoint', { 
        signal,
        // Long timeout to ensure we hit the abort first
        headers: { 'X-Simulated-Delay': '2000' } 
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      return await response.json()
    },
    enabled: shouldFetch,
    retry: false,
  })

  // Handler for unmount during fetch test
  const handleTestUnmountDuringFetch = () => {
    setShouldFetch(true)
    setShouldAutoAbort(false)
    
    toast({
      title: 'Test started',
      description: 'Navigate away from this page to test component unmount during fetch',
    })
  }

  // Handler for auto abort test
  const handleTestAutoAbort = () => {
    setShouldFetch(true)
    setShouldAutoAbort(true)
    
    toast({
      title: 'Auto-abort test started',
      description: 'Request will auto-abort in 500ms',
    })
  }

  // Handler for manual abort test
  const handleManualAbort = () => {
    // This would normally come from a stored controller reference
    // For testing we just dispatch an abort event
    window.dispatchEvent(new Event('abort-pending-requests'))
    
    toast({
      title: 'Manual abort triggered',
      description: 'All pending requests should be aborted',
    })
  }

  // Test synchronous error
  const handleTestSyncError = () => {
    try {
      // Deliberately throw an error
      throw new Error('This is a test synchronous error')
    } catch (err) {
      toast({
        title: 'Synchronous error caught',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  // Test uncaught error (will trigger error boundary)
  const handleTestUncaughtError = () => {
    // This should trigger the error boundary
    throw new Error('This is a deliberate uncaught error for testing')
  }

  // Test promise rejection
  const handleTestPromiseRejection = () => {
    Promise.reject(new Error('This is a deliberate promise rejection for testing'))
    
    toast({
      title: 'Promise rejection triggered',
      description: 'Check console for unhandled rejection',
    })
  }

  // Test network error
  const handleTestNetworkError = async () => {
    try {
      // Try to fetch from a non-existent domain
      await fetch('https://non-existent-domain-for-testing-123456.com')
    } catch (err) {
      toast({
        title: 'Network error caught',
        description: err instanceof Error ? err.message : 'Network request failed',
        variant: 'destructive'
      })
    }
  }
  
  // Test slow endpoint with various delays
  const handleTestSlowEndpoint = async (delay = 3000) => {
    console.log(`Testing slow endpoint with ${delay}ms delay...`);
    
    toast({
      title: 'Slow endpoint test started',
      description: `Request with ${delay}ms delay initiated`
    });
    
    try {
      const response = await fetch(`/api/deliberately-slow-endpoint`, {
        headers: {
          'X-Simulated-Delay': String(delay),
          'X-Request-ID': crypto.randomUUID()
        }
      });
      
      const data = await response.json();
      
      toast({
        title: 'Slow endpoint responded',
        description: `Response received after ${delay}ms`,
      });
      
      console.log('Slow response received:', data);
    } catch (err) {
      toast({
        title: 'Slow endpoint error',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'destructive'
      });
      
      console.error('Error from slow endpoint:', err);
    }
  }
  
  // Test slow endpoint with auto-abort
  const handleTestSlowEndpointWithAbort = async (delay = 5000, abortAfter = 1500) => {
    console.log(`Testing slow endpoint with ${delay}ms delay and auto-abort after ${abortAfter}ms...`);
    
    toast({
      title: 'Auto-abort test started',
      description: `Request will auto-abort after ${abortAfter}ms`
    });
    
    const controller = new AbortController();
    
    // Set up auto-abort timer
    const timeoutId = setTimeout(() => {
      console.log(`Auto-aborting request after ${abortAfter}ms`);
      controller.abort('Manual timeout abort');
    }, abortAfter);
    
    try {
      const response = await fetch(`/api/deliberately-slow-endpoint`, {
        headers: {
          'X-Simulated-Delay': String(delay),
          'X-Request-ID': crypto.randomUUID()
        },
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      toast({
        title: 'Unexpected response',
        description: 'The request should have been aborted but completed instead',
        variant: 'destructive'
      });
      
      console.log('Unexpected response received:', data);
    } catch (err) {
      // Clear the timeout since we got an error
      clearTimeout(timeoutId);
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast({
          title: 'Request aborted successfully',
          description: err.message || 'The request was aborted as expected'
        });
        
        console.log('Request aborted successfully:', err);
      } else {
        toast({
          title: 'Unexpected error',
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          variant: 'destructive'
        });
        
        console.error('Unexpected error from slow endpoint:', err);
      }
    }
  }

  return (
    <Card className="mt-4 mb-8">
      <CardHeader>
        <CardTitle>Error Testing Tools</CardTitle>
        <CardDescription>
          Test error handling capabilities in the application (Development only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="abort-errors">Abort Errors</TabsTrigger>
            <TabsTrigger value="other-errors">Other Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="abort-errors" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <h3 className="font-medium mb-2">Test Component Unmount During Fetch</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test starts a query and expects you to navigate away while it's loading.
                  It tests the route change cleanup code.
                </p>
                <Button onClick={handleTestUnmountDuringFetch} variant="outline">
                  Start Test (then navigate away)
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Auto-abort</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test triggers a query that will automatically abort after 500ms.
                </p>
                <Button onClick={handleTestAutoAbort} variant="outline">
                  Test Auto-Abort
                </Button>
                
                {query.isPending && (
                  <p className="text-sm mt-2 text-yellow-600">
                    Query is loading... {shouldAutoAbort ? '(will auto-abort soon)' : ''}
                  </p>
                )}
                
                {query.isError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <p className="font-medium text-red-600">Error: {String(query.error)}</p>
                    <p className="text-muted-foreground mt-1">
                      {query.error instanceof Error && query.error.name === 'AbortError' 
                        ? 'This is an AbortError as expected. Our error handling should handle this gracefully.'
                        : 'Unexpected error type.'}
                    </p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Manually Abort All Requests</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test manually triggers abortion of all pending requests.
                </p>
                <Button onClick={handleManualAbort} variant="outline">
                  Abort All Pending Requests
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Deliberately Slow Endpoint</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test uses our special slow endpoint to test behavior with delayed responses.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => handleTestSlowEndpoint(1000)} 
                    variant="outline"
                    size="sm"
                  >
                    1s Delay
                  </Button>
                  <Button 
                    onClick={() => handleTestSlowEndpoint(3000)} 
                    variant="outline"
                    size="sm"
                  >
                    3s Delay
                  </Button>
                  <Button 
                    onClick={() => handleTestSlowEndpoint(5000)} 
                    variant="outline"
                    size="sm"
                  >
                    5s Delay
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Auto-Abort with Slow Endpoint</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test initiates a deliberately slow response and auto-aborts it midway.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => handleTestSlowEndpointWithAbort(3000, 1500)} 
                    variant="outline"
                    size="sm"
                  >
                    Abort After 1.5s
                  </Button>
                  <Button 
                    onClick={() => handleTestSlowEndpointWithAbort(5000, 800)} 
                    variant="outline"
                    size="sm"
                  >
                    Abort After 0.8s
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="other-errors" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <h3 className="font-medium mb-2">Test Synchronous Error (Caught)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test throws and catches a synchronous error.
                </p>
                <Button onClick={handleTestSyncError} variant="outline">
                  Throw Caught Error
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Uncaught Error (Will Trigger Error Boundary)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test throws an uncaught error that should trigger the error boundary.
                </p>
                <Button onClick={handleTestUncaughtError} variant="outline">
                  Throw Uncaught Error
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Unhandled Promise Rejection</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test creates an unhandled promise rejection.
                </p>
                <Button onClick={handleTestPromiseRejection} variant="outline">
                  Trigger Promise Rejection
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Test Network Error</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This test attempts to fetch from a non-existent domain.
                </p>
                <Button onClick={handleTestNetworkError} variant="outline">
                  Trigger Network Error
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          These tools should only be used during development.
        </div>
        
        {query.isFetching && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              // TanStack Query v5 doesn't have a cancel method directly
              // Instead, we'll use our manual abort handler
              window.dispatchEvent(new Event('abort-pending-requests'));
            }}
          >
            Cancel Query
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default ErrorTestingPanel