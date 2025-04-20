import React from 'react'
import { useState, useEffect } from 'react'
import { Route, Switch, useLocation, useRoute } from 'wouter'
import { Shell } from './components/layout/Shell'
import { EmbedShell } from './components/layout/EmbedShell'
import { ShippingLabelForm } from './components/shipping/ShippingLabelForm'

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
  // Check if the route is the shipping form route
  const [location] = useLocation();
  const [matchShipping] = useRoute('/shipping');
  
  console.log("🚨 DEBUG - Ruta actual:", location);
  console.log("🚨 DEBUG - matchShipping:", matchShipping);
  
  // Verificamos si la ruta actual es la del formulario de envío
  const isShippingFormRoute = location === '/shipping' || matchShipping;
  
  console.log("🚨 DEBUG - ¿Es ruta de formulario de envío?", isShippingFormRoute);
  
  // Este efecto se ejecuta cuando la página carga
  useEffect(() => {
    console.log("🚨 DEBUG - App montada con ruta:", location);
    console.log("🚨 DEBUG - window.location.pathname:", window.location.pathname);
    
    // Si estamos en /shipping pero no se ha detectado, forzar la detección
    if (window.location.pathname === '/shipping' && !isShippingFormRoute) {
      console.log("🚨 DEBUG - Forzando detección de ruta /shipping");
      window.history.replaceState(null, '', '/shipping');
    }
  }, [location, isShippingFormRoute]);
  
  // Si estamos en la ruta del formulario de envío, usamos el shell embebido sin menú
  if (isShippingFormRoute) {
    console.log("🚨 DEBUG - Renderizando formulario de envío independiente");
    return (
      <EmbedShell>
        <div className="container mx-auto py-8 max-w-2xl">
          <h1 className="text-2xl font-bold mb-6 text-center">Formulario de Envío</h1>
          <ShippingLabelForm />
        </div>
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
        {/* Añadir explícitamente la ruta de shipping como una alternativa */}
        <Route path="/shipping">
          <div className="container mx-auto py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-center">Formulario de Envío (Ruta Alternativa)</h1>
            <ShippingLabelForm />
          </div>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Shell>
  )
}

export default App