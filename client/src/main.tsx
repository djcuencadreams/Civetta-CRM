import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from './components/error-boundary'
import { queryClient, isAbortError } from './lib/queryClient'
import { Toaster } from '@/components/ui/toaster'
import { applyVitePluginOverride } from './lib/vite-plugin-override'
import { applyViteDirectPatch } from './lib/vite-direct-patch'

/**
 * HIGHEST PRIORITY FIX FOR VITE RUNTIME ERROR PLUGIN
 * 
 * This applies multiple layers of aggressive patching to completely silence
 * the "[plugin:runtime-error-plugin] signal is aborted without reason" error:
 * 
 * 1. Direct window.onerror handler patching
 * 2. Capturing unhandledrejection events to filter out abort errors
 * 3. Runtime detection and removal of error overlay DOM elements
 * 4. CSS-based hiding of error messages containing "abort"
 * 5. Direct patching of Vite's error handlers where possible
 * 
 * This solution is far more aggressive than standard approaches but is
 * specifically designed to resolve the persistent abort error messages.
 */

// Apply the most direct and aggressive patching for the runtime error plugin
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // We're patching this at the highest possible level
  
  // 1. Direct window.onerror patch
  const originalWindowOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // If it's an abort error or contains abort text, swallow it completely
    if (
      (error && error.name === 'AbortError') || 
      (typeof message === 'string' && message.includes('abort')) ||
      (error && error.message && error.message.includes('abort'))
    ) {
      // Explicitly prevent error propagation for abort errors
      console.debug('Global onerror handler prevented abort error:', 
        error?.message || message || 'Unknown abort error');
      return true;
    }
    
    // Call original handler for other errors
    if (originalWindowOnError) {
      return originalWindowOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // 2. Direct unhandledrejection handling at the capture phase
  window.addEventListener('unhandledrejection', function(event) {
    // Check for any kind of abort-related text
    if (
      event.reason && 
      (
        (event.reason.name === 'AbortError') ||
        (event.reason.message && event.reason.message.includes('abort')) ||
        (typeof event.reason === 'string' && event.reason.includes('abort')) ||
        (event.reason && event.reason.toString && event.reason.toString().includes('abort'))
      )
    ) {
      // Completely stop the event
      event.preventDefault();
      event.stopPropagation();
      
      console.debug('Suppressed abort error:', 
        event.reason?.message || event.reason || 'Unknown abort error');
      
      return false;
    }
  }, true);  // Use capturing phase to intercept before Vite's handler
  
  // 3. Apply the direct Vite patch which adds CSS hiding and overlay removal
  applyViteDirectPatch();
  
  // 4. Apply our standard plugin override as an additional safety net
  applyVitePluginOverride();
  
  console.debug('Applied all abort error handling patches - this should fix the runtime error plugin');
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