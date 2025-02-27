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
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WordPressIntegration() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    siteUrl: "",
    consumerKey: "",
    consumerSecret: ""
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');

  // Test WordPress connection
  const testConnection = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/connect", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to connect to WordPress");
      }
      return res.json();
    },
    onSuccess: () => {
      setConnectionStatus('connected');
      toast({ 
        title: "Conexión exitosa", 
        description: "Conectado correctamente a WordPress/WooCommerce"
      });
    },
    onError: (error: Error) => {
      setConnectionStatus('failed');
      toast({ 
        title: "Error de conexión", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Import customers from WordPress
  const importCustomers = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/import-customers", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to import customers");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se importaron ${data.importedCustomers} clientes de WordPress.`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de importación", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Import orders from WordPress
  const importOrders = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/wordpress/import-orders", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to import orders");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se importaron ${data.importedOrders} ventas de WordPress.`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de importación", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Handle credentials change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value
    });
    // Reset connection status when credentials change
    if (connectionStatus !== 'idle') {
      setConnectionStatus('idle');
    }
  };

  // Test the connection
  const handleTestConnection = () => {
    if (!credentials.siteUrl || !credentials.consumerKey || !credentials.consumerSecret) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos",
        variant: "destructive"
      });
      return;
    }
    testConnection.mutate(credentials);
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

        <Tabs defaultValue="config">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="import">Importar Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div>
              <Label htmlFor="siteUrl">URL del sitio</Label>
              <Input 
                id="siteUrl"
                name="siteUrl"
                placeholder="https://tutienda.ejemplo.com" 
                value={credentials.siteUrl}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="consumerKey">Clave API de WooCommerce</Label>
              <Input 
                id="consumerKey"
                name="consumerKey"
                type="password" 
                placeholder="ck_xxxxxxxxxxxx" 
                value={credentials.consumerKey}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="consumerSecret">Secreto API de WooCommerce</Label>
              <Input 
                id="consumerSecret"
                name="consumerSecret"
                type="password" 
                placeholder="cs_xxxxxxxxxxxx" 
                value={credentials.consumerSecret}
                onChange={handleInputChange}
              />
            </div>

            <Button 
              onClick={handleTestConnection} 
              disabled={testConnection.isPending}
              className="w-full"
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando conexión...
                </>
              ) : (
                <>
                  Probar conexión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {connectionStatus === 'connected' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Conexión exitosa</AlertTitle>
                <AlertDescription>
                  Conectado correctamente a WordPress/WooCommerce
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === 'failed' && (
              <Alert variant="destructive">
                <AlertTitle>Error de conexión</AlertTitle>
                <AlertDescription>
                  No se pudo conectar a WordPress. Verifique las credenciales e intente nuevamente.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertTitle>Obtener credenciales de WooCommerce</AlertTitle>
              <AlertDescription>
                <p className="text-sm mb-2">Para obtener las credenciales API de WooCommerce:</p>
                <ol className="list-decimal pl-4 space-y-1 text-sm">
                  <li>Acceda al panel de administración de WordPress</li>
                  <li>Vaya a WooCommerce → Configuración → Avanzado → API REST</li>
                  <li>Haga clic en "Añadir clave" y configure los permisos de lectura/escritura</li>
                  <li>Copie la Clave del consumidor y el Secreto del consumidor</li>
                </ol>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Alert>
              <AlertTitle>Importación de datos</AlertTitle>
              <AlertDescription>
                Importe clientes, productos y ventas desde su tienda WordPress.
                Debe configurar la conexión primero.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                onClick={() => importCustomers.mutate()}
                disabled={connectionStatus !== 'connected' || importCustomers.isPending}
              >
                {importCustomers.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : "Importar Clientes"}
              </Button>

              <Button 
                variant="outline"
                onClick={() => importOrders.mutate()}
                disabled={connectionStatus !== 'connected' || importOrders.isPending}
              >
                {importOrders.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : "Importar Ventas"}
              </Button>
            </div>

            <Alert>
              <AlertTitle>Sincronización automática</AlertTitle>
              <AlertDescription>
                La sincronización automática con WordPress estará disponible en la próxima actualización.
                Por ahora, puede importar datos manualmente.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
