import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/error-handling';
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

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return { 
      hasError: true,
      error,
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to our error tracking system
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

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, use our default error UI
      return (
        <Card className="w-full max-w-md mx-auto mt-8 shadow-lg">
          <CardHeader className="bg-destructive/10 text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription className="text-destructive/80">
              An error occurred while rendering this component
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm font-mono bg-muted p-4 rounded overflow-auto max-h-[200px]">
              {this.state.error?.message || 'Unknown error'}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
            <Button 
              variant="default" 
              onClick={this.handleReset}
            >
              Try Again
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