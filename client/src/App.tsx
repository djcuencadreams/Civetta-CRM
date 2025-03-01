import React from 'react'
import { useState } from 'react'
import { Route, Switch } from 'wouter'
import { Shell } from './components/layout/Shell'

// Import pages
import Dashboard from './pages/dashboard'
import Customers from './pages/customers'
import Leads from './pages/leads'
import Sales from './pages/sales'
import Orders from './pages/orders'
import SimpleReports from './pages/reports-simple'
import EnhancedReports from './pages/reports-new'
import Reports from './pages/reports'
import Configuration from './pages/configuration'
import NotFound from './pages/not-found'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)

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
  )
}

export default App