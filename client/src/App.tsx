import React from 'react'
import { Route, Switch } from "wouter"
import DashboardPage from "@/pages/dashboard"
import LeadsPage from "@/pages/leads"
import CustomersPage from "@/pages/customers"
import SalesPage from "@/pages/sales"
import IntegrationsPage from "@/pages/integrations"
import NotFoundPage from "@/pages/not-found"

function App() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/sales" component={SalesPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  )
}

export default App