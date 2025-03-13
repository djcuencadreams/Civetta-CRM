import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type ErrorType = 'render' | 'event' | 'async' | 'abort' | 'api';

// BuggyCounter component that will throw an error after certain number of clicks
class BuggyCounter extends React.Component<{ maxClicks: number }, { count: number }> {
  state = { count: 0 };
  
  handleClick = () => {
    this.setState(prevState => ({ count: prevState.count + 1 }));
  };
  
  render() {
    if (this.state.count >= this.props.maxClicks) {
      throw new Error("Error: BuggyCounter ha explotado después de " + this.props.maxClicks + " clicks!");
    }
    
    return (
      <div>
        <p>Clicks: {this.state.count}</p>
        <button 
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={this.handleClick}
        >
          Incrementar
        </button>
      </div>
    );
  }
}

// This component demonstrates a better way to handle API errors with Error Boundaries
function ErrorBoundaryFriendlyApiTest() {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // This technique converts async errors to render errors, which Error Boundaries can catch
  if (error) {
    throw error;
  }
  
  const handleApiErrorClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-error');
      if (!response.ok) {
        const data = await response.json();
        // By setting the error in state, we make it trigger during render
        // which Error Boundary can then catch properly
        setError(new Error(`Error API (properly handled): ${data.error || 'Error desconocido'}`));
        return;
      }
      // This won't execute since the API always returns an error
      setIsLoading(false);
    } catch (e) {
      // If the fetch itself fails (network error), we also want to propagate that to Error Boundary
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };
  
  return (
    <div className="mt-4 p-4 border border-blue-200 rounded bg-blue-50">
      <h4 className="text-blue-800 font-medium mb-2">Error Boundary Compatible API Test</h4>
      <p className="text-blue-700 text-sm mb-4">
        Esta implementación muestra cómo hacer que los errores de API sean compatibles con Error Boundary
      </p>
      <Button 
        variant="outline" 
        onClick={handleApiErrorClick}
        disabled={isLoading}
        className="bg-white"
      >
        {isLoading ? 'Cargando...' : 'Probar Error API compatible'}
      </Button>
    </div>
  );
}

export function ErrorTest() {
  const [shouldError, setShouldError] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>('render');
  
  // This will throw an error when shouldError is true and errorType is 'render'
  if (shouldError && errorType === 'render') {
    throw new Error("Error intencional: Error durante el renderizado del componente");
  }
  
  const throwEventError = () => {
    setShouldError(true);
    throw new Error("Error intencional: Error en un manejador de eventos");
  };
  
  const throwAsyncError = async () => {
    setShouldError(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error("Error intencional: Error asíncrono");
  };
  
  const simulateAbortError = () => {
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Create a fetch request that will be aborted
    fetch('/api/some-endpoint', { signal })
      .catch(err => {
        console.log('Fetch abortado:', err.message);
      });
    
    // Abort the request
    controller.abort();
  };
  
  const testApiError = async () => {
    try {
      // Set error state to true to indicate we're testing errors
      setShouldError(true);
      
      // Make API call that will fail
      const response = await fetch('/api/test-error');
      
      // If the response is not ok, throw an error
      if (!response.ok) {
        const data = await response.json();
        console.log('API error response:', data);
        
        // Throwing this error demonstrates two things:
        // 1. How to properly handle API errors
        // 2. That Error Boundary won't catch async errors by default
        throw new Error(`Error API: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error calling test-error endpoint:', error);
      
      // Re-throwing the error here won't be caught by Error Boundary directly
      // This demonstrates the need for proper error handling in async operations
      throw error;
    }
  };
  
  const handleErrorTypeChange = (value: string) => {
    setErrorType(value as ErrorType);
  };
  
  const triggerSelectedError = () => {
    switch (errorType) {
      case 'render':
        setShouldError(true);
        break;
      case 'event':
        throwEventError();
        break;
      case 'async':
        throwAsyncError().catch(error => {
          console.error('Error asíncrono capturado:', error);
        });
        break;
      case 'abort':
        simulateAbortError();
        break;
      case 'api':
        testApiError().catch(error => {
          console.error('Error API capturado en el manejador:', error);
          // This message will show in the console but the error won't be caught by ErrorBoundary
          // because it happens in an async context that the ErrorBoundary can't monitor
        });
        break;
    }
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Prueba de manejo de errores</CardTitle>
        <CardDescription>
          Esta sección permite probar diferentes escenarios de error y cómo son manejados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de error a probar:</label>
          <Select value={errorType} onValueChange={handleErrorTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar tipo de error" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="render">Error durante el renderizado</SelectItem>
              <SelectItem value="event">Error en manejador de eventos</SelectItem>
              <SelectItem value="async">Error asíncrono</SelectItem>
              <SelectItem value="abort">Error de Abort (no debe activar ErrorBoundary)</SelectItem>
              <SelectItem value="api">Error de API (test-error endpoint)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="p-4 border rounded bg-amber-50">
          <h4 className="text-amber-800 font-medium mb-2">Componente con error programado</h4>
          <p className="text-amber-700 text-sm mb-4">Este contador lanzará un error después de 3 clicks</p>
          
          <div className="p-3 bg-white rounded">
            <BuggyCounter maxClicks={3} />
          </div>
        </div>
        
        {/* Add the new component that properly handles API errors with Error Boundaries */}
        <ErrorBoundaryFriendlyApiTest />
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          onClick={triggerSelectedError}
          className="w-full"
        >
          Probar error: {errorType === 'render' ? 'Renderizado' : 
                        errorType === 'event' ? 'Evento' : 
                        errorType === 'async' ? 'Asíncrono' : 
                        errorType === 'abort' ? 'Abort' : 'API'}
        </Button>
      </CardFooter>
    </Card>
  );
}