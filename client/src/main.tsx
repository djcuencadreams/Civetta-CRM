import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from './components/error-boundary'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/toaster'
import { installAbortErrorFilter } from './lib/abort-error-filter'

/**
 * Fix for the Vite Runtime Error Plugin
 * 
 * This installs a focused error filter that specifically prevents AbortErrors
 * from showing up as "[plugin:runtime-error-plugin] signal is aborted without reason"
 * errors in the Vite error overlay.
 * 
 * This is a focused solution that directly addresses the root cause without
 * using complex workarounds or extensive patching.
 */

// Install the minimal abort error filter for Vite's runtime error plugin
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Install the focused error filter
  installAbortErrorFilter();
  
  console.debug('Installed focused abort error filter for Vite runtime error plugin');
}

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
            <Toaster />
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