import React from 'react';
import { ErrorTest } from '../components/ErrorTest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ErrorTestPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Sistema de Manejo de Errores</h1>
      <p className="text-gray-500 mb-6">
        Esta página demuestra el sistema de manejo de errores implementado en la aplicación.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Prueba de Error Boundary</CardTitle>
            <CardDescription>
              Prueba cómo el Error Boundary atrapa errores en los componentes 
              y muestra una interfaz de recuperación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorTest />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funcionamiento del sistema</CardTitle>
            <CardDescription>
              Explicación de cómo funciona el manejo de errores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Boundary</AlertTitle>
              <AlertDescription>
                El Error Boundary es un componente que captura errores durante el renderizado,
                en métodos del ciclo de vida y en los constructores de componentes hijos.
              </AlertDescription>
            </Alert>

            <h3 className="font-semibold mt-4">Tipos de errores manejados:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Errores de renderizado</span>: Capturados directamente por el Error Boundary.
              </li>
              <li>
                <span className="font-medium">Errores en eventos</span>: Propagados al Error Boundary si no son manejados.
              </li>
              <li>
                <span className="font-medium">Errores asíncronos</span>: Requieren try/catch o .catch() para ser manejados apropiadamente.
              </li>
              <li>
                <span className="font-medium">Errores de API</span>: Requieren una técnica especial para ser manejados por Error Boundary.
                <ul className="list-disc pl-5 mt-1 text-sm">
                  <li>Método estándar: Solo manejados con try/catch pero no capturados por Error Boundary</li>
                  <li>Método mejorado: Convertirlos a errores de renderizado con useState para que el Error Boundary los capture</li>
                </ul>
              </li>
            </ul>

            <Alert className="bg-green-50 text-green-800 border-green-200 mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Beneficios</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                  <li>Previene que la aplicación se bloquee por completo</li>
                  <li>Ofrece una interfaz amigable durante errores</li>
                  <li>Facilita la recuperación sin recargar la página</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Implementación en el código</CardTitle>
          <CardDescription>
            Cómo está implementado el sistema de manejo de errores en nuestra aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-auto">
            <pre>{`// En main.tsx
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)`}</pre>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Código para manejo de errores de API con Error Boundary:</h3>
            <div className="rounded bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-auto">
              <pre>{`// Componente que maneja errores de API de forma efectiva
function ErrorBoundaryFriendlyApiTest() {
  const [error, setError] = useState<Error | null>(null);
  
  // ¡CLAVE! Si hay error, lanzarlo durante renderizado
  if (error) throw error;
  
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/test-error');
      if (!response.ok) {
        const data = await response.json();
        // Usar setState para convertir error asíncrono a error de renderizado
        setError(new Error(data.error));
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };
}`}</pre>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Recomendaciones para desarrolladores:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Usar try/catch para manejar errores asíncronos</li>
              <li>Convertir errores de API a errores de renderizado con useState</li>
              <li>No ocultar errores críticos, permitir que el Error Boundary los capture</li>
              <li>Implementar logging de errores en producción</li>
              <li>Considerar límites de error más granulares donde sea necesario</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}