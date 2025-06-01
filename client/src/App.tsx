import React from 'react'
import { Route, Switch, useLocation } from 'wouter'
import ShippingFormPage from "@/pages/embed/shipping-form";
import { EmbedShell } from "@/components/layout/EmbedShell";
import { Shell } from './components/layout/Shell'
// import { EmbedShell } from './components/layout/EmbedShell' // Duplicate import, removing
// import ShippingFormPage from './pages/embed/shipping-form' // Duplicate import, removing

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
import Opportunities from './pages/opportunities'
import OpportunitiesNew from './pages/opportunities/new'
import OpportunityDetail from './pages/opportunities/[id]'
import Interactions from './pages/interactions'
import Activities from './pages/activities'
import NotFound from './pages/not-found'

function App() {
  const [location] = useLocation()

  const isShippingRoute =
    location === '/shipping' ||
    (typeof window !== 'undefined' && window.location.pathname === '/shipping')

  if (isShippingRoute) {
    return (
      <EmbedShell>
        <ShippingFormPage />
      </EmbedShell>
    )
  }

  // COMENTADO - MODO FORMULARIO SOLO
  /*
  return (
    <Shell>
      <QueryClient client={queryClient}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/customers" component={() => import('./pages/customers')} />
          <Route path="/leads" component={() => import('./pages/leads')} />
          <Route path="/sales" component={() => import('./pages/sales')} />
          <Route path="/orders" component={() => import('./pages/orders')} />
          <Route path="/products" component={() => import('./pages/products')} />
          <Route path="/configuration" component={() => import('./pages/configuration')} />
          <Route path="/integrations" component={() => import('./pages/integrations')} />
          <Route path="/reports" component={() => import('./pages/reports')} />
          <Route path="/reports-new" component={() => import('./pages/reports-new')} />
          <Route path="/reports-simple" component={() => import('./pages/reports-simple')} />
          <Route path="/activities" component={() => import('./pages/activities')} />
          <Route path="/interactions" component={() => import('./pages/interactions')} />
          <Route path="/opportunities" component={() => import('./pages/opportunities')} />
          <Route path="/opportunities/new" component={() => import('./pages/opportunities/new')} />
          <Route path="/opportunities/new-simple" component={() => import('./pages/opportunities/new-simple')} />
          <Route path="/opportunities/:id" component={() => import('./pages/opportunities/[id]')} />
          <Route component={() => import('./pages/not-found')} />
        </Switch>
      </QueryClient>
    </Shell>
  )
  */
}

export default App