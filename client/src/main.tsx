import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "./components/theme-provider"

// Create a query client with default configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

// Add an error boundary to catch any React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Error en getDerivedStateFromError:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error)
    console.error('Component stack:', errorInfo.componentStack)
    
    // Mostrar error en el DOM para diagnóstico
    const errorDiv = document.createElement('div')
    errorDiv.style.padding = '20px'
    errorDiv.style.margin = '20px'
    errorDiv.style.backgroundColor = '#fff1f1'
    errorDiv.style.border = '1px solid #ff4040'
    errorDiv.innerHTML = `
      <h2>Error en Componente React</h2>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
      <pre>${errorInfo.componentStack}</pre>
    `
    document.body.appendChild(errorDiv)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#fff1f1',
          border: '1px solid #ff4040',
          borderRadius: '5px'
        }}>
          <h1 style={{color: '#c00'}}>Error en la aplicación</h1>
          <p>Ocurrió un error al renderizar la aplicación:</p>
          <pre style={{
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '3px',
            overflowX: 'auto'
          }}>
            {this.state.error?.message}
          </pre>
          <pre style={{
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '3px',
            overflowX: 'auto'
          }}>
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

// Prueba simple sin todos los componentes
const SimpleApp = () => {
  return (
    <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
      <h1 style={{color: '#333', marginBottom: '20px'}}>CIVETTA CRM - Versión de diagnóstico</h1>
      <p style={{marginBottom: '20px'}}>Esta es una versión mínima para diagnosticar problemas de renderizado de React.</p>
      <div style={{padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '5px'}}>
        <h2 style={{marginBottom: '10px'}}>Componente de prueba</h2>
        <p>Si puedes ver este mensaje, React está funcionando correctamente en su forma más básica.</p>
      </div>
    </div>
  )
}

// Initialize React with proper error handling
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired')
  
  try {
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('No se encontró el elemento root en el DOM')
    }

    // Log debug information
    console.log('React version:', React.version)
    console.log('Root element found:', rootElement)
    console.log('Root element innerHTML:', rootElement.innerHTML)

    // Prueba 1: Renderizado directo sin nada extra
    ReactDOM.createRoot(rootElement).render(<SimpleApp />)

    /*
    // Prueba 2: Renderizado con todas las dependencias
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
    )
    */
  } catch (error) {
    console.error('Error initializing React:', error)
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; max-width: 600px; margin: 40px auto; border: 1px solid #f56565; border-radius: 8px; background-color: #fff5f5;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Error de Inicialización de React</h1>
        <p style="margin-bottom: 16px;">No se pudo inicializar la aplicación React:</p>
        <pre style="padding: 12px; background-color: #f8f8f8; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `
  }
})