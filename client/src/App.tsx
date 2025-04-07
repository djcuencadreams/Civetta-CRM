import React from 'react'
import { useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/layout/Shell'
import { EmbedShell } from './components/layout/EmbedShell'

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

// Embed pages
import EmbedShippingForm from './pages/embed/shipping-form'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)

  // Check if the route is an embeddable route
  const [location] = useLocation();
  const isEmbedRoute = location.startsWith('/embed/') && location !== '/embed/shipping-form-static';

  // For embeddable routes, use EmbedShell without any chrome
  if (isEmbedRoute) {
    return (
      <EmbedShell>
        <Switch>
          <Route path="/embed/shipping-form">
            <EmbedShippingForm />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </EmbedShell>
    );
  }

  // For CRM routes, use regular Shell with sidebar
  return (
    <Shell>
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
        <Route path="/opportunities">
          <Opportunities />
        </Route>
        <Route path="/opportunities/new">
          <OpportunitiesNew />
        </Route>
        <Route path="/opportunities/:id">
          <OpportunityDetail />
        </Route>
        <Route path="/interactions">
          <Interactions />
        </Route>
        <Route path="/activities">
          <Activities />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Shell>
  )
}

export default App