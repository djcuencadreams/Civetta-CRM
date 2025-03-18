import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiWordpress } from "react-icons/si";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Search, 
  RefreshCw,
  Users, 
  ArrowRightLeft
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WordPressIntegration() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    siteUrl: "",
    storeName: "",
    consumerKey: "",
    consumerSecret: ""
  });
  const [connected, setConnected] = useState(false);
  // Estado para la información de conexión (forzando los tipos para consistencia)
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    storeName: string;
    siteUrl: string;
    storeInfo: {
      productsCount: number;
      ordersCount: number;
      version: string;
    }
  }>({
    connected: false,
    storeName: "",
    siteUrl: "",
    storeInfo: {
      productsCount: 0,
      ordersCount: 0,
      version: ""
    }
  });
  const [importStatus, setImportStatus] = useState({
    customers: { total: 0, imported: 0, inProgress: false },
    orders: { total: 0, imported: 0, inProgress: false },
    products: { total: 0, imported: 0, inProgress: false }
  });
  
  // Estado para manejar la verificación y sincronización de clientes
  const [customerSearchParams, setCustomerSearchParams] = useState({
    email: "",
    phone: "",
    idNumber: "",
    ruc: ""
  });
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [syncDirection, setSyncDirection] = useState<"toWoo" | "fromWoo">("toWoo");
  const [wooCommerceId, setWooCommerceId] = useState<string>("");

  // Consulta para obtener la configuración actual de WooCommerce
  const { data: configData, isLoading: isLoadingConfig } = useQuery<{
    url?: string;
    hasCredentials?: boolean;
    enabled?: boolean;
    storeName?: string;
    storeInfo?: {
      version?: string;
      productsCount?: number;
      ordersCount?: number;
    };
  }>({
    queryKey: ['/api/configuration/woocommerce']
  });
  
  // Efecto para actualizar las credenciales cuando se carga la configuración
  useEffect(() => {
    if (configData) {
      // Actualizar siteUrl y storeName siempre, pero preservar credenciales si ya existen
      // en el estado local (para no obligar a ingresarlos nuevamente)
      setCredentials(prev => ({
        siteUrl: configData.url || prev.siteUrl || "",
        storeName: configData.storeName || prev.storeName || "",
        // Solo actualizar credenciales si están vacías (primera carga)
        consumerKey: prev.consumerKey || "",
        consumerSecret: prev.consumerSecret || ""
      }));
      
      // Actualizamos el estado de conexión si tenemos datos y está habilitado
      if (configData.hasCredentials && configData.enabled) {
        setConnected(true);
        
        // Actualizamos la información de la tienda si está disponible
        setConnectionStatus({
          connected: true,
          storeName: configData.storeName || "Tienda WooCommerce",
          siteUrl: configData.url || "",
          storeInfo: {
            productsCount: configData.storeInfo?.productsCount || 0,
            ordersCount: configData.storeInfo?.ordersCount || 0,
            version: configData.storeInfo?.version || ""
          }
        });
      } else {
        // Si hay datos pero no está habilitado o faltan credenciales, reseteamos
        setConnected(false);
      }
    }
  }, [configData]);

  // Connection test mutation - Solo verifica la conexión sin guardar nada
  const connectMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/configuration/woocommerce/test", {
        url: data.siteUrl,
        storeName: data.storeName,
        consumerKey: data.consumerKey,
        consumerSecret: data.consumerSecret
      });
      if (!res.ok) {
        // Intentar obtener los detalles del error
        try {
          const error = await res.json();
          throw new Error(error.details || error.message || error.error || "Error de conexión con WordPress");
        } catch (parseError) {
          // Si no se puede leer como JSON, usar el texto del error
          const errorText = await res.text();
          throw new Error(errorText || `Error de conexión: código ${res.status}`);
        }
      }
      
      try {
        return await res.json();
      } catch (parseError) {
        throw new Error("La respuesta del servidor no es un JSON válido");
      }
    },
    onSuccess: (data) => {
      // Actualizar el estado con la información de la tienda
      setConnectionStatus({
        connected: true,
        storeName: data.store?.name || "Tienda WooCommerce",
        siteUrl: data.store?.url || credentials.siteUrl,
        storeInfo: {
          productsCount: data.store?.productsCount || 0,
          ordersCount: data.store?.ordersCount || 0,
          version: data.store?.version || ""
        }
      });
      
      toast({ 
        title: "Conexión exitosa", 
        description: `Se ha verificado correctamente la conexión a ${data.store?.name || "WordPress/WooCommerce"}. Haga clic en "Guardar configuración" para guardar estos ajustes.`
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
  
  // Save configuration mutation - Guarda permanentemente la configuración en la BD
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      const res = await apiRequest("POST", "/api/configuration/woocommerce", {
        url: data.siteUrl,
        storeName: data.storeName || connectionStatus.storeName,
        consumerKey: data.consumerKey,
        consumerSecret: data.consumerSecret,
        enabled: true
      });
      if (!res.ok) {
        try {
          const error = await res.json();
          throw new Error(error.details || error.message || error.error || "Error al guardar la configuración");
        } catch (parseError) {
          const errorText = await res.text();
          throw new Error(errorText || `Error al guardar: código ${res.status}`);
        }
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Configuración guardada", 
        description: `La configuración de WooCommerce ha sido guardada correctamente.`
      });
      
      // Invalidar la consulta para actualizar los datos
      window.dispatchEvent(new CustomEvent('invalidate-queries', {
        detail: { queryKeys: [['/api/configuration/woocommerce']] }
      }));
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al guardar", 
        description: error.message,
        variant: "destructive"
      });
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
  
  // Verificación de cliente por múltiples criterios
  const verifyCustomerMutation = useMutation({
    mutationFn: async (params: typeof customerSearchParams) => {
      // Construir query params
      const queryParams = new URLSearchParams();
      if (params.email) queryParams.append('email', params.email);
      if (params.phone) queryParams.append('phone', params.phone);
      if (params.idNumber) queryParams.append('idNumber', params.idNumber);
      if (params.ruc) queryParams.append('ruc', params.ruc);
      
      const res = await apiRequest("GET", `/api/woocommerce/verify-customer?${queryParams.toString()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al verificar cliente");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.existsInCRM) {
        toast({ 
          title: "Cliente encontrado en CRM", 
          description: data.matchBetweenSystems 
            ? "El cliente existe en ambos sistemas y coincide correctamente"
            : "El cliente existe en CRM pero no está vinculado con WooCommerce"
        });
      } else if (data.existsInWooCommerce) {
        toast({ 
          title: "Cliente encontrado solo en WooCommerce", 
          description: "El cliente existe en WooCommerce pero no en CRM"
        });
      } else {
        toast({ 
          title: "Cliente no encontrado", 
          description: "No se encontró el cliente en ninguno de los sistemas"
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de verificación", 
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Sincronización de cliente de CRM a WooCommerce
  const syncToWooMutation = useMutation({
    mutationFn: async ({ id, createIfNotExists }: { id: number, createIfNotExists: boolean }) => {
      const res = await apiRequest("POST", `/api/woocommerce/sync-customer/${id}`, { createIfNotExists });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al sincronizar cliente");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Sincronización exitosa", 
        description: data.message || "Cliente sincronizado con WooCommerce"
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de sincronización", 
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Sincronización de cliente desde WooCommerce a CRM
  const syncFromWooMutation = useMutation({
    mutationFn: async (wooId: number) => {
      const res = await apiRequest("POST", `/api/woocommerce/sync-customer-from-woo/${wooId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al sincronizar cliente");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Sincronización exitosa", 
        description: data.message || "Cliente sincronizado desde WooCommerce al CRM"
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de sincronización", 
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Carga de clientes para el selector
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    // No necesita queryFn porque el cliente está configurado con un fetcher por defecto
    enabled: connected // Solo cargar si estamos conectados
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
  
  // Save configuration
  const handleSaveConfiguration = () => {
    if (!connected) {
      toast({ 
        title: "Error", 
        description: "Por favor, pruebe la conexión antes de guardar la configuración",
        variant: "destructive"
      });
      return;
    }
    
    saveConfigMutation.mutate(credentials);
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
  
  // Handle search params changes
  const handleSearchParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerSearchParams(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle verify customer
  const handleVerifyCustomer = () => {
    // Verificar que al menos un parámetro está presente
    const { email, phone, idNumber, ruc } = customerSearchParams;
    if (!email && !phone && !idNumber && !ruc) {
      toast({ 
        title: "Error", 
        description: "Por favor, proporcione al menos un criterio de búsqueda",
        variant: "destructive"
      });
      return;
    }
    
    verifyCustomerMutation.mutate(customerSearchParams);
  };
  
  // Handle sync to WooCommerce
  const handleSyncToWoo = () => {
    if (!selectedCustomer) {
      toast({ 
        title: "Error", 
        description: "Por favor, seleccione un cliente para sincronizar",
        variant: "destructive"
      });
      return;
    }
    
    syncToWooMutation.mutate({ 
      id: selectedCustomer, 
      createIfNotExists: true 
    });
  };
  
  // Handle sync from WooCommerce
  const handleSyncFromWoo = () => {
    const id = parseInt(wooCommerceId);
    if (isNaN(id) || id <= 0) {
      toast({ 
        title: "Error", 
        description: "Por favor, introduzca un ID de WooCommerce válido",
        variant: "destructive"
      });
      return;
    }
    
    syncFromWooMutation.mutate(id);
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
            <Label htmlFor="store-name">Nombre descriptivo de la tienda (opcional)</Label>
            <Input 
              id="store-name"
              name="storeName"
              placeholder="Mi Tienda de Moda"
              value={credentials.storeName}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Un nombre para identificar esta conexión en el CRM
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button 
              onClick={handleTestConnection}
              disabled={connectMutation.isPending}
              className="w-full"
              variant={connected ? "outline" : "default"}
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : connected ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verificar conexión
                </>
              ) : (
                "Probar conexión"
              )}
            </Button>
            
            <Button 
              onClick={handleSaveConfiguration}
              disabled={!connected || saveConfigMutation.isPending}
              className="w-full"
              variant={configData?.enabled && connected ? "outline" : "default"}
            >
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : configData?.enabled && connected ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Configuración guardada
                </>
              ) : (
                "Guardar configuración"
              )}
            </Button>
          </div>

          {connected && !configData?.enabled && (
            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Conexión verificada - No guardada</AlertTitle>
                <AlertDescription>
                  Se ha verificado la conexión pero aún no ha sido guardada. Haga clic en "Guardar configuración" para mantener estos ajustes.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {connected && configData?.enabled && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Conexión activa y guardada</AlertTitle>
                <AlertDescription>
                  Se ha conectado correctamente a tu tienda WordPress/WooCommerce y la configuración está guardada.
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-md p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Información de la tienda conectada</h4>
                <dl className="space-y-2 text-sm">
                  <div className="grid grid-cols-3">
                    <dt className="font-medium text-gray-500">Nombre:</dt>
                    <dd className="col-span-2">{connectionStatus.storeName || credentials.storeName || "Tienda WooCommerce"}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="font-medium text-gray-500">URL:</dt>
                    <dd className="col-span-2 truncate">{credentials.siteUrl}</dd>
                  </div>
                  {connectionStatus.storeInfo.version && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-gray-500">Versión:</dt>
                      <dd className="col-span-2">WooCommerce {connectionStatus.storeInfo.version}</dd>
                    </div>
                  )}
                  {connectionStatus.storeInfo.productsCount > 0 && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-gray-500">Productos:</dt>
                      <dd className="col-span-2">{connectionStatus.storeInfo.productsCount}</dd>
                    </div>
                  )}
                  {connectionStatus.storeInfo.ordersCount > 0 && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-gray-500">Pedidos:</dt>
                      <dd className="col-span-2">{connectionStatus.storeInfo.ordersCount}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
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
          
          {saveConfigMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error al guardar la configuración</AlertTitle>
              <AlertDescription>
                {saveConfigMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
          
          {saveConfigMutation.isSuccess && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Configuración guardada</AlertTitle>
              <AlertDescription>
                La configuración de WooCommerce ha sido guardada correctamente y estará disponible en tu próximo inicio de sesión.
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

          {connected && (
            <div className="pt-4">
              <h3 className="font-medium mb-2">Sincronización de clientes</h3>
              
              <Tabs defaultValue="verify" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="verify">Verificar</TabsTrigger>
                  <TabsTrigger value="to-woo">CRM → WooCommerce</TabsTrigger>
                  <TabsTrigger value="from-woo">WooCommerce → CRM</TabsTrigger>
                </TabsList>
                
                <TabsContent value="verify" className="pt-4 space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Verificar cliente por identificación</h4>
                    <p className="text-xs text-muted-foreground">
                      Comprueba si un cliente existe en ambos sistemas y si está correctamente sincronizado.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email"
                          name="email"
                          value={customerSearchParams.email}
                          onChange={handleSearchParamChange}
                          placeholder="cliente@ejemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input 
                          id="phone"
                          name="phone"
                          value={customerSearchParams.phone}
                          onChange={handleSearchParamChange}
                          placeholder="+593991234567"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="idNumber">Cédula</Label>
                        <Input 
                          id="idNumber"
                          name="idNumber"
                          value={customerSearchParams.idNumber}
                          onChange={handleSearchParamChange}
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ruc">RUC</Label>
                        <Input 
                          id="ruc"
                          name="ruc"
                          value={customerSearchParams.ruc}
                          onChange={handleSearchParamChange}
                          placeholder="1234567890001"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleVerifyCustomer}
                      disabled={verifyCustomerMutation.isPending}
                    >
                      {verifyCustomerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Verificar cliente
                        </>
                      )}
                    </Button>
                    
                    {verifyCustomerMutation.isSuccess && (
                      <Alert className={
                        verifyCustomerMutation.data.matchBetweenSystems 
                          ? "bg-green-50 border-green-200 text-green-800" 
                          : "bg-yellow-50 border-yellow-200 text-yellow-800"
                      }>
                        <AlertTitle>
                          {verifyCustomerMutation.data.matchBetweenSystems 
                            ? "Cliente sincronizado correctamente" 
                            : "Verificación completada"}
                        </AlertTitle>
                        <AlertDescription>
                          {verifyCustomerMutation.data.existsInCRM && verifyCustomerMutation.data.existsInWooCommerce ? (
                            verifyCustomerMutation.data.matchBetweenSystems
                              ? "El cliente existe en ambos sistemas y está correctamente vinculado."
                              : "El cliente existe en ambos sistemas pero no está correctamente vinculado."
                          ) : verifyCustomerMutation.data.existsInCRM ? (
                            "El cliente existe en el CRM pero no en WooCommerce."
                          ) : verifyCustomerMutation.data.existsInWooCommerce ? (
                            "El cliente existe en WooCommerce pero no en el CRM."
                          ) : (
                            "No se encontró ningún cliente con los criterios proporcionados."
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="to-woo" className="pt-4 space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Sincronizar cliente a WooCommerce</h4>
                    <p className="text-xs text-muted-foreground">
                      Selecciona un cliente del CRM para sincronizarlo con WooCommerce.
                    </p>
                    
                    <div>
                      <Label htmlFor="customer-select">Seleccionar cliente</Label>
                      <Select 
                        onValueChange={(value) => setSelectedCustomer(parseInt(value))}
                        value={selectedCustomer?.toString() || ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.firstName} {customer.lastName} - {customer.idNumber || customer.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleSyncToWoo}
                      disabled={syncToWooMutation.isPending || !selectedCustomer}
                    >
                      {syncToWooMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Sincronizar a WooCommerce
                        </>
                      )}
                    </Button>
                    
                    {syncToWooMutation.isSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Sincronización exitosa</AlertTitle>
                        <AlertDescription>
                          {syncToWooMutation.data.message || "Cliente sincronizado con WooCommerce correctamente."}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {syncToWooMutation.isError && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error de sincronización</AlertTitle>
                        <AlertDescription>
                          {syncToWooMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="from-woo" className="pt-4 space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Importar cliente desde WooCommerce</h4>
                    <p className="text-xs text-muted-foreground">
                      Introduce el ID de cliente en WooCommerce para importarlo al CRM.
                    </p>
                    
                    <div>
                      <Label htmlFor="woo-customer-id">ID de cliente en WooCommerce</Label>
                      <Input 
                        id="woo-customer-id"
                        name="wooCommerceId"
                        type="number"
                        value={wooCommerceId}
                        onChange={(e) => setWooCommerceId(e.target.value)}
                        placeholder="123"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Puedes encontrar el ID en el panel de WooCommerce en la sección de clientes.
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleSyncFromWoo}
                      disabled={syncFromWooMutation.isPending || !wooCommerceId}
                    >
                      {syncFromWooMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          Importar desde WooCommerce
                        </>
                      )}
                    </Button>
                    
                    {syncFromWooMutation.isSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Importación exitosa</AlertTitle>
                        <AlertDescription>
                          {syncFromWooMutation.data.message || "Cliente importado desde WooCommerce correctamente."}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {syncFromWooMutation.isError && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error de importación</AlertTitle>
                        <AlertDescription>
                          {syncFromWooMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="info">
              <AccordionTrigger className="text-sm font-medium">
                Información de sincronización
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong>Sincronización automática:</strong> El sistema sincroniza automáticamente los clientes entre WooCommerce y el CRM cuando:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Se crea un nuevo cliente en cualquiera de los sistemas</li>
                    <li>Se actualiza un cliente existente en cualquiera de los sistemas</li>
                    <li>Se recibe un pedido nuevo en WooCommerce</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Identificadores:</strong> El sistema utiliza múltiples identificadores para evitar duplicados:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Cédula / Documento de identidad</li>
                    <li>RUC (Registro Único de Contribuyentes)</li>
                    <li>Email</li>
                    <li>Número de teléfono</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
