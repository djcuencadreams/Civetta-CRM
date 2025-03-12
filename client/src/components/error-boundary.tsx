/**
 * Error Boundary component to catch and handle React component errors
 */
import React, { Component, ErrorInfo, ReactNode, ReactElement, isValidElement } from 'react';
import { captureError } from '@/lib/error-handling/monitoring';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Interface for the fallback props
interface FallbackProps {
  error: Error;
  resetError: () => void;
}

// Props for the ErrorBoundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement | ((props: FallbackProps) => ReactElement);
  componentName?: string;
  allowReset?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// State for the ErrorBoundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches errors in its child component tree
 * and displays a fallback UI instead of crashing the entire app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Default props
  static defaultProps = {
    allowReset: true,
    componentName: 'Component'
  };

  // Initialize state
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  /**
   * Update state when an error occurs during rendering
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Handle errors caught during rendering
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture the error for monitoring
    captureError(error, {
      source: 'react',
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName
    });
    
    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error state
   */
  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    // If there's no error, render the children
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback } = this.props;
    const { error } = this.state;
    
    // Handle different types of fallbacks
    if (fallback) {
      // If fallback is a function, call it with the error and resetError
      if (typeof fallback === 'function') {
        if (!error) return null; // Shouldn't happen, but for type safety
        return fallback({ error, resetError: this.resetError });
      }
      
      // If fallback is a React element, return it directly
      if (isValidElement(fallback)) {
        return fallback;
      }
    }

    // Render default fallback UI
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="text-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          
          {this.props.allowReset && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={this.resetError}
              className="mt-2"
            >
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
}

export default ErrorBoundary;

/**
 * Higher-order component to wrap a component with an ErrorBoundary
 * 
 * @param Component The component to wrap
 * @param errorBoundaryProps Props for the ErrorBoundary
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary
      componentName={displayName}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}