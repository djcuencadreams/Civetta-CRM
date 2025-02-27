import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiWordpress } from "react-icons/si";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function WordPressIntegration() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    siteUrl: "",
    consumerKey: "",
    consumerSecret: ""
  });
  const [connected, setConnected] = useState(false);
  const [importStatus, setImportStatus] = useState({
    customers: { total: 0, imported: 0, inProgress: false },
    orders: { total: 0, imported: 0, inProgress: false },
    products: { total: 0, imported: 0, inProgress: false }
  });

  // Connection test mutation
  const connectMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/connect", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error de conexión con WordPress");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Conexión exitosa", 
        description: "Se ha conectado correctamente a WordPress/WooCommerce"
      });
      setConnected(true);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de conexión", 
        description: error.message,
        variant: "destructive"
      });
      setConnected(false);
    }
  });

  // Import customers mutation
  const importCustomersMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/import-customers", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al importar clientes");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se han importado ${data.importedCustomers} clientes de WordPress`
      });
      setImportStatus(prev => ({
        ...prev,
        customers: { 
          total: data.totalCustomers, 
          imported: data.importedCustomers,
          inProgress: false
        }
      }));
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de importación", 
        description: error.message,
        variant: "destructive"
      });
      setImportStatus(prev => ({
        ...prev,
        customers: { ...prev.customers, inProgress: false }
      }));
    }
  });

  // Import orders mutation
  const importOrdersMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/import-orders", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al importar pedidos");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se han importado ${data.importedOrders} pedidos de WordPress`
      });
      setImportStatus(prev => ({
        ...prev,
        orders: { 
          total: data.totalOrders, 
          imported: data.importedOrders,
          inProgress: false
        }
      }));
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de importación", 
        description: error.message,
        variant: "destructive"
      });
      setImportStatus(prev => ({
        ...prev,
        orders: { ...prev.orders, inProgress: false }
      }));
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    // Reset connection status when credentials change
    if (connected) {
      setConnected(false);
    }
  };

  // Test connection
  const handleTestConnection = () => {
    if (!credentials.siteUrl || !credentials.consumerKey || !credentials.consumerSecret) {
      toast({ 
        title: "Error", 
        description: "Por favor, complete todos los campos de la configuración",
        variant: "destructive"
      });
      return;
    }
    
    connectMutation.mutate(credentials);
  };

  // Import customers
  const handleImportCustomers = () => {
    if (!connected) {
      toast({ 
        title: "Error", 
        description: "Por favor, conecte primero con WordPress",
        variant: "destructive"
      });
      return;
    }
    
    setImportStatus(prev => ({
      ...prev,
      customers: { ...prev.customers, inProgress: true }
    }));
    importCustomersMutation.mutate(credentials);
  };

  // Import orders
  const handleImportOrders = () => {
    if (!connected) {
      toast({ 
        title: "Error", 
        description: "Por favor, conecte primero con WordPress",
        variant: "destructive"
      });
      return;
    }
    
    setImportStatus(prev => ({
      ...prev,
      orders: { ...prev.orders, inProgress: true }
    }));
    importOrdersMutation.mutate(credentials);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SiWordpress className="h-5 w-5" />
          WordPress / WooCommerce
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Sincroniza clientes, productos y ventas con tu tienda 10web.io/WordPress.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="site-url">URL del sitio WordPress</Label>
            <Input 
              id="site-url"
              name="siteUrl"
              placeholder="https://tutienda.com"
              value={credentials.siteUrl}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              La URL completa de tu sitio WordPress
            </p>
          </div>
          
          <div>
            <Label htmlFor="consumer-key">Clave de consumidor (Consumer Key)</Label>
            <Input 
              id="consumer-key"
              name="consumerKey"
              type="password"
              placeholder="ck_xxxxxxxxxxxx"
              value={credentials.consumerKey}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encuentra esto en WooCommerce → Ajustes → API → Claves/Apps
            </p>
          </div>
          
          <div>
            <Label htmlFor="consumer-secret">Secreto de consumidor (Consumer Secret)</Label>
            <Input 
              id="consumer-secret"
              name="consumerSecret"
              type="password"
              placeholder="cs_xxxxxxxxxxxx"
              value={credentials.consumerSecret}
              onChange={handleInputChange}
            />
          </div>
          
          <Button 
            onClick={handleTestConnection}
            disabled={connectMutation.isPending}
            className="w-full"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : connected ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Conectado
              </>
            ) : (
              "Probar conexión"
            )}
          </Button>

          {connected && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Conexión exitosa</AlertTitle>
              <AlertDescription>
                Se ha conectado correctamente a tu tienda WordPress/WooCommerce.
              </AlertDescription>
            </Alert>
          )}

          {connectMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error de conexión</AlertTitle>
              <AlertDescription>
                {connectMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4">
            <h3 className="font-medium mb-2">Importar datos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={handleImportCustomers}
                disabled={!connected || importStatus.customers.inProgress}
              >
                {importStatus.customers.inProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando clientes...
                  </>
                ) : (
                  "Importar Clientes"
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleImportOrders}
                disabled={!connected || importStatus.orders.inProgress}
              >
                {importStatus.orders.inProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando ventas...
                  </>
                ) : (
                  "Importar Ventas"
                )}
              </Button>
            </div>
          </div>

          {(importStatus.customers.imported > 0 || importStatus.orders.imported > 0) && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium">Resumen de importación:</h3>
              {importStatus.customers.imported > 0 && (
                <p className="text-xs">
                  Clientes: {importStatus.customers.imported} de {importStatus.customers.total} importados
                </p>
              )}
              {importStatus.orders.imported > 0 && (
                <p className="text-xs">
                  Ventas: {importStatus.orders.imported} de {importStatus.orders.total} importadas
                </p>
              )}
            </div>
          )}

          <Alert>
            <AlertTitle>Sincronización automática</AlertTitle>
            <AlertDescription>
              La sincronización automática con WordPress estará disponible pronto. Por ahora, puedes importar datos manualmente.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
