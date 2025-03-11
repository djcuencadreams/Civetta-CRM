import React from 'react';
import { logError } from '@/lib/errorHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

/**
 * Props for the error boundary's fallback UI
 */
interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  errorInfo?: React.ErrorInfo;
}

/**
 * Default fallback UI for the error boundary
 */
export function ErrorFallback({ error, resetErrorBoundary, errorInfo }: FallbackProps) {
  // Extract error ID if available
  const errorId = (error as any).errorId;
  
  return (
    <Card className="w-full max-w-md mx-auto my-8 border-destructive/50">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle>Something went wrong</CardTitle>
        </div>
        <CardDescription>
          An error occurred in this component
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Error:</div>
          <div className="text-sm p-2 bg-muted rounded break-words font-mono">
            {error.message}
          </div>
        </div>
        
        {errorId && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Reference:</div>
            <div className="text-sm text-muted-foreground font-mono">
              {errorId}
            </div>
          </div>
        )}
        
        {errorInfo && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Component Stack:</div>
            <div className="text-xs p-2 bg-muted rounded max-h-[200px] overflow-auto font-mono">
              {errorInfo.componentStack.split('\n').map((line, i) => 
                <div key={i} className="whitespace-nowrap">{line}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button 
          variant="secondary" 
          onClick={() => window.location.href = '/'}
        >
          Go Home
        </Button>
        <Button onClick={resetErrorBoundary}>
          Try Again
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Props for the error boundary component
 */
export interface ErrorBoundaryProps {
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
  children: React.ReactNode;
}

/**
 * State for the error boundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error boundary component that catches errors in its child components
 * and displays a fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Handle component error and capture error info
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo });
    
    // Log the error
    const errorId = logError(error, { 
      componentStack: errorInfo.componentStack,
      source: 'ErrorBoundary'
    });
    
    // Attach the error ID to the error object for reference
    (error as any).errorId = errorId;
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error boundary state
   */
  resetErrorBoundary = () => {
    // Reset error state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided, otherwise use default
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.resetErrorBoundary} 
        />
      );
    }

    // Render children if no error
    return this.props.children;
  }
}

/**
 * Simplified function to wrap a component with an error boundary
 * @param Component The component to wrap with error boundary
 * @returns Wrapped component
 */
export function withErrorBoundary<Props>(
  WrappedComponent: React.ComponentType<Props>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  function ComponentWithErrorBoundary(props: Props & JSX.IntrinsicAttributes) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}