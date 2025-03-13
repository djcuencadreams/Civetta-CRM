import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/error-handling';
import { queryClient, isAbortError } from '@/lib/queryClient';

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

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Don't show the error UI for aborted fetch requests
    // (these happen during navigation or when components unmount)
    if (isAbortError(error)) {
      console.debug(`ErrorBoundary: Ignoring abort error in UI: ${error.message}`);
      return { 
        hasError: false,
        error: null,
        errorInfo: null 
      };
    }
    
    // For other errors, update state to show the fallback UI
    return { 
      hasError: true,
      error,
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't log abort errors as they're expected and not actual errors
    if (isAbortError(error)) {
      console.debug(`ErrorBoundary: Not logging abort error: ${error.message}`);
      return;
    }
    
    // Log other errors to our error tracking system
    logError(error, {
      component: 'ErrorBoundary',
      react: true,
      componentStack: errorInfo.componentStack
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