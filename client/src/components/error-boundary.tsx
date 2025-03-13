import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { isAbortError, logError } from '@/lib/global-error-handler';
import { queryClient } from '@/lib/queryClient';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React rendering errors
 * This prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Handle errors during rendering, using our enhanced detection for AbortErrors
   * We specifically only ignore genuine fetch abort signals, never generic errors 
   * that happen to mention "abort" somewhere in their message
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Use enhanced isAbortError with verbose flag for detailed logging
    if (isAbortError(error, { verbose: true })) {
      // Use our enhanced logging function to log suppression with detailed context
      logError(error, {
        component: 'ErrorBoundary',
        lifecycle: 'getDerivedStateFromError',
        action: 'suppressed',
        errorType: 'abortError',
        suppressReason: 'Fetch abort signal during render phase'
      }, {
        suppressAbortErrors: true,
        detailedAbortLogs: true,
        logLevel: 'debug'
      });
      
      // For abort errors, return a clean state to prevent UI disruption
      return { 
        hasError: false,
        error: null,
        errorInfo: null 
      };
    }
    
    // For all other errors, update state to show the fallback UI
    return { 
      hasError: true,
      error,
      errorInfo: null 
    };
  }

  /**
   * After an error is caught, log it appropriately using our enhanced system
   * This only logs real errors, not expected abort signals from network requests
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a genuine AbortController signal
    if (isAbortError(error, { verbose: true })) {
      // Use our enhanced logging for detailed contextual information
      logError(error, {
        component: 'ErrorBoundary',
        lifecycle: 'componentDidCatch',
        action: 'ignored',
        errorType: 'abortError',
        componentStack: errorInfo?.componentStack ? 
          errorInfo.componentStack.split('\n').slice(0, 5).join('\n') : 
          'Component stack unavailable'
      }, {
        suppressAbortErrors: true,
        detailedAbortLogs: true,
        logLevel: 'debug'
      });
      return;
    }
    
    // For all other errors, log with full context using error level
    logError(error, {
      component: 'ErrorBoundary',
      lifecycle: 'componentDidCatch',
      action: 'logged',
      errorType: error.name || 'Error',
      react: true,
      componentStack: errorInfo?.componentStack || 'Component stack unavailable',
      timestamp: new Date().toISOString()
    }, {
      suppressAbortErrors: true,
      detailedAbortLogs: false,
      logLevel: 'error'
    });
  }

  handleReset = () => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Invalidate any queries that might have caused the error
    queryClient.invalidateQueries();
  };

  // Determine if the error is a network error
  isNetworkError(error: Error | null): boolean {
    if (!error) return false;
    // Check for our custom network error type
    if ((error as any).isNetworkError) return true;
    
    // Also check for common network error messages
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('internet') ||
      message.includes('offline') ||
      message.includes('connection')
    );
  }
  
  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const error = this.state.error;
      
      // Check for specific error types to provide more helpful messages
      const isNetwork = this.isNetworkError(error);
      
      // Otherwise, use our default error UI with contextual messages
      return (
        <Card className="w-full max-w-md mx-auto mt-8 shadow-lg">
          <CardHeader className={isNetwork ? "bg-orange-100 text-orange-700" : "bg-destructive/10 text-destructive"}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} />
              <CardTitle>
                {isNetwork 
                  ? "Network Connection Issue" 
                  : "Something went wrong"}
              </CardTitle>
            </div>
            <CardDescription className={isNetwork ? "text-orange-600/80" : "text-destructive/80"}>
              {isNetwork
                ? "There was a problem connecting to the server"
                : "An error occurred while rendering this component"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm font-mono bg-muted p-4 rounded overflow-auto max-h-[200px]">
              {error?.message || 'Unknown error'}
            </div>
            
            {isNetwork && (
              <div className="mt-4 text-sm">
                <p className="font-medium">Troubleshooting steps:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Make sure the server is running</li>
                  <li>Try refreshing the page</li>
                  <li>If problems persist, contact support</li>
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
            <Button 
              variant={isNetwork ? "secondary" : "default"}
              onClick={this.handleReset}
            >
              {isNetwork ? "Retry Connection" : "Try Again"}
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 * @param Component The component to wrap
 * @param fallback Optional custom fallback UI
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}

// Also export as default for compatibility
export default ErrorBoundary;