import React from 'react'
import { useState } from 'react'
import { Route, Switch } from 'wouter'
import { Shell } from './components/layout/Shell'

// Import pages
import Dashboard from './pages/dashboard'
import Customers from './pages/customers'
import Leads from './pages/leads'
import Sales from './pages/sales'
import Integrations from './pages/integrations'
import NotFound from './pages/not-found'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)

  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/leads" component={Leads} />
        <Route path="/sales" component={Sales} />
        <Route path="/integrations" component={Integrations} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  )
}

export default App