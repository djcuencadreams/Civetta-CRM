import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import SalesPage from "@/pages/sales";
import IntegrationsPage from "@/pages/integrations";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/sales" component={SalesPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <Router />
      </Shell>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
