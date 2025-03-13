import React, { useEffect } from 'react'
import { useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/layout/Shell'
import { logError } from '@/lib/error-handling'
import ErrorBoundary from '@/components/error-boundary'
import { ServerStatusIndicator } from './components/ServerHealth'
import { isAbortError } from '@/lib/queryClient'
import { queryClient } from '@/lib/queryClient'

// Listen for the global abort event to cancel all in-flight requests
// This is used by the ErrorTestingPanel component
if (typeof window !== 'undefined') {
  window.addEventListener('abort-pending-requests', () => {
    console.debug('Manual abort of all pending requests triggered');
    
    // Cancel all queries in the React Query cache
    queryClient.cancelQueries();
    
    // Also dispatch a custom event that our abort-patches.ts might be listening for
    const controllers = (window as any).__activeAbortControllers || [];
    controllers.forEach((controller: AbortController) => {
      try {
        controller.abort('Manual abort triggered');
      } catch (err) {
        // Ignore errors in aborting
      }
    });
  });
}

// Import pages
import Dashboard from './pages/dashboard'
import Customers from './pages/customers'
import Leads from './pages/leads'
import Sales from './pages/sales'
import Orders from './pages/orders'
import Products from './pages/products'
import SimpleReports from './pages/reports-simple'
import EnhancedReports from './pages/reports-new'
import Reports from './pages/reports'
import Configuration from './pages/configuration'
import NotFound from './pages/not-found'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)
  
  // Handle route change cleanup directly
  const [location] = useLocation();
  
  // Clean up queries when route changes
  useEffect(() => {
    // When location changes, cancel all in-flight requests
    console.debug('Route changed, canceling in-flight requests');
    queryClient.cancelQueries();
  }, [location]);
  
  // Apply abort controller patches
  useEffect(() => {
    // Import and apply our abort controller patches
    import('./lib/abort-patches')
      .then(({ applyAbortControllerPatches, applyFetchPatches }) => {
        // Apply both patches to improve error handling for aborted requests
        applyAbortControllerPatches();
        applyFetchPatches();
      })
      .catch(error => {
        console.error('Failed to load abort patches:', error);
      });
  }, []);
  
  // Set up global error handler
  useEffect(() => {
    // Set up a global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      // Ignore AbortError errors completely
      if (event.error && isAbortError(event.error)) {
        event.preventDefault();
        console.debug('Prevented error event for aborted request:', event.error.message);
        return;
      }
      
      event.preventDefault();
      logError(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    // Add global error event listener
    window.addEventListener('error', handleGlobalError);
    
    // Cleanup function when component unmounts
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Shell>
        {/* Server status indicator at the app level */}
        <div className="fixed bottom-4 right-4 z-50">
          <ServerStatusIndicator />
        </div>
        
        <Switch>
          <Route path="/">
            <Dashboard />
          </Route>
          <Route path="/customers">
            <Customers />
          </Route>
          <Route path="/leads">
            <Leads />
          </Route>
          <Route path="/sales">
            <Sales />
          </Route>
          <Route path="/orders">
            <Orders />
          </Route>
          <Route path="/products">
            <Products />
          </Route>
          <Route path="/reports">
            <SimpleReports />
          </Route>
          <Route path="/reports-new">
            <EnhancedReports />
          </Route>
          <Route path="/reports-advanced">
            <Reports />
          </Route>
          <Route path="/configuration">
            <Configuration />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Shell>
    </ErrorBoundary>
  )
}

export default App