/**
 * Error Handling Demo Page
 * 
 * This page demonstrates the proper error handling techniques implemented in our application.
 * It shows examples of:
 * 1. Safe query cancellation during navigation
 * 2. Proper abort controller usage
 * 3. How to avoid unhandled promise rejections
 */
import React, { useState } from 'react';
import { Link } from 'wouter';
import { SafeQueryExample } from '@/components/examples/SafeQueryExample';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { safeCancelQueries } from '@/lib/queryClient';

/**
 * Error Handling Demo Page Component
 */
export default function ErrorHandlingDemo() {
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Trigger an abort of all requests
  const triggerAbort = () => {
    // Dispatch the global abort event
    window.dispatchEvent(new Event('abort-pending-requests'));
    setShowSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  // Manually cancel all queries (safe version)
  const cancelQueries = () => {
    safeCancelQueries();
    setShowSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Error Handling Demo</h1>
          <Link href="/">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
        
        {showSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              All in-flight requests have been safely cancelled without errors.
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">About this page</AlertTitle>
          <AlertDescription className="text-blue-700">
            This page demonstrates our improved error handling system that properly handles 
            aborted requests during navigation. The example components below show how to use
            our safe hooks to prevent "unhandled promise rejection" errors.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Manual Test Controls</CardTitle>
            <CardDescription>
              Use these buttons to manually test the error handling system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button onClick={triggerAbort} variant="destructive">
                Abort All Pending Requests
              </Button>
              <p className="text-sm text-gray-500">
                This will trigger a global abort event that cancels all in-flight requests.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={cancelQueries} variant="outline">
                Cancel All React Query Requests Safely
              </Button>
              <p className="text-sm text-gray-500">
                This will use our safeCancelQueries function to cancel React Query requests.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="example">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="example">Safe Query Example</TabsTrigger>
            <TabsTrigger value="info">Implementation Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="example" className="p-4">
            <SafeQueryExample />
          </TabsContent>
          
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Implementation Details</CardTitle>
                <CardDescription>
                  How our error handling system works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Key Components</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li><strong>safeCancelQueries</strong> - Safely cancels all React Query requests</li>
                    <li><strong>createSafeAbortController</strong> - Creates an AbortController that won't throw on abort</li>
                    <li><strong>useSafeAbort</strong> - Hook for safe Abort Controller usage</li>
                    <li><strong>useSafeQuery</strong> - Enhanced React Query hook with abort safety</li>
                    <li><strong>useSafeMutation</strong> - Enhanced mutation hook with abort safety</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Implementation Philosophy</h3>
                  <p className="mt-2">
                    Rather than suppressing errors globally (which can mask real issues),
                    our solution specifically targets and handles abort errors at their source.
                    This ensures that genuine errors are still visible while preventing
                    "unhandled promise rejection" errors during normal navigation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}