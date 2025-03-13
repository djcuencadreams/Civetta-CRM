import React, { useEffect } from 'react'
import { useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/layout/Shell'
import { logError } from '@/lib/error-handling'
import ErrorBoundary from '@/components/error-boundary'
import { ServerStatusIndicator } from './components/ServerHealth'
import { 
  queryClient, 
  safeCancelQueries, 
  createSafeAbortController 
} from '@/lib/queryClient'

// Import unified error handling
import { initializeErrorHandling, isAbortError } from '@/lib/error-handling-index'

// Listen for the global abort event to cancel all in-flight requests
// This is used by the ErrorTestingPanel component
if (typeof window !== 'undefined') {
  window.addEventListener('abort-pending-requests', () => {
    console.debug('Manual abort of all pending requests triggered');
    
    // Use our safe function to cancel queries without errors
    safeCancelQueries();
    
    // Create a master abort controller and abort it safely
    const masterController = createSafeAbortController('Manual user-triggered abort');
    masterController.abort('User requested abort');
    
    // Also abort any tracked controllers in the global registry
    const controllers = (window as any).__activeAbortControllers || [];
    if (controllers.size > 0) {
      console.debug(`Aborting ${controllers.size} tracked controllers`);
      controllers.forEach((controller: AbortController) => {
        if (controller && controller.signal && !controller.signal.aborted) {
          try {
            controller.abort('Manual abort triggered');
          } catch (err) {
            // Log but continue
            console.debug('Error aborting controller:', err);
          }
        }
      });
    }
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
import ErrorTest from './pages/error-test'
import TestErrorHandling from './pages/test-error-handling'
import ErrorHandlingDemo from './pages/error-handling-demo'
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
    
    // Use our safe cancelQueries function that handles errors properly
    safeCancelQueries();
    
    // Create a properly configured abort controller with reason
    const controller = createSafeAbortController('Route change cleanup');
    
    // Return cleanup function
    return () => {
      if (!controller.signal.aborted) {
        controller.abort('Navigation abort');
      }
    };
  }, [location]);
  
  // Initialize the comprehensive error handling system
  useEffect(() => {
    // Initialize all error handling mechanisms at once
    initializeErrorHandling();
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
          <Route path="/error-test">
            <ErrorTest />
          </Route>
          <Route path="/test-error-handling">
            <TestErrorHandling />
          </Route>
          <Route path="/error-handling-demo">
            <ErrorHandlingDemo />
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