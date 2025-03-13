import React from 'react';
import { Button } from "@/components/ui/button";

interface Props { 
  children: React.ReactNode;
  fallbackRender?: (props: { error: Error; resetErrorBoundary: () => void }) => React.ReactNode;
}

interface State { 
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state = { 
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return { 
      hasError: true,
      error 
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for development
    console.error('Critical frontend error caught by ErrorBoundary:', error);
    console.error('Component stack:', info.componentStack);
    
    // Here you could also log to an error reporting service like Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, info);
    // }
  }
  
  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback renderer is provided, use it
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error!,
          resetErrorBoundary: this.resetErrorBoundary
        });
      }
      
      // Default error UI
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[300px] bg-destructive/5 rounded-lg border border-destructive/20">
          <h2 className="text-2xl font-bold text-destructive mb-4">Ocurrió un error inesperado</h2>
          <p className="text-gray-600 mb-6 max-w-md text-center">
            Lo sentimos, ha ocurrido un problema. Por favor, intente recargar la página o contacte a soporte técnico si el problema persiste.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
            <Button 
              variant="default"
              onClick={this.resetErrorBoundary}
            >
              Intentar recuperar
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;