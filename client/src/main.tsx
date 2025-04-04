import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "./components/theme-provider"
import ErrorBoundary from './components/ErrorBoundary'
import { initializeGlobalErrorHandlers } from './lib/global-error-handler'
import { getQueryFn } from './lib/queryClient'

// Initialize global error handlers
initializeGlobalErrorHandlers()

// Create a query client with default configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

// Initialize React with proper error handling
try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('No se encontró el elemento root en el DOM')
  }

  // Log debug information
  console.log('React version:', React.version)
  console.log('Root element found:', rootElement)

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