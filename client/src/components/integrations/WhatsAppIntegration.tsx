import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { InfoIcon } from "lucide-react";

// Define the WhatsAppConfig type
interface WhatsAppConfig {
  enabled: boolean;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  whatsappNumber: string;
  webhookUrl: string;
  orderNotificationsEnabled: boolean;
  paymentNotificationsEnabled: boolean;
}

export function WhatsAppIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState({
    accountSid: "",
    authToken: "",
    whatsappNumber: ""
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);

  // Fetch WhatsApp configuration
  const { data: config, isLoading, error } = useQuery<WhatsAppConfig>({
    queryKey: ["/api/configuration/whatsapp"],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 10000,
    retry: 1,
    onError: (err) => {
      console.warn("Error fetching WhatsApp config:", err);
      // Don't show toast for this error as it's not critical for the user experience
    }
  });

  // Update WhatsApp configuration
  const updateConfig = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/configuration/whatsapp", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration/whatsapp"] });
      toast({ title: "Configuración actualizada" });
      setShowCredentials(false);
      setCredentials({
        accountSid: "",
        authToken: "",
        whatsappNumber: config?.whatsappNumber || ""
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error al actualizar configuración", 
        description: error.message || "Ha ocurrido un error al actualizar la configuración",
        variant: "destructive" 
      });
    }
  });

  // Send test message
  const sendTestMessage = useMutation({
    mutationFn: async (values: { phone: string, message: string }) => {
      const res = await apiRequest("POST", "/api/whatsapp/send", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mensaje enviado",
        description: `ID del mensaje: ${data.messageSid}`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error al enviar mensaje", 
        description: error.message || "Ha ocurrido un error al enviar el mensaje",
        variant: "destructive" 
      });
    }
  });

  // Handle save configuration
  const handleSaveConfig = () => {
    const configData: any = {
      ...credentials
    };
    
    if (config?.orderNotificationsEnabled !== orderNotifications) {
      configData.orderNotificationsEnabled = orderNotifications;
    }
    
    if (config?.paymentNotificationsEnabled !== paymentNotifications) {
      configData.paymentNotificationsEnabled = paymentNotifications;
    }
    
    updateConfig.mutate(configData);
  };

  // Handle send test message
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Este es un mensaje de prueba desde el CRM.");

  const handleSendTest = () => {
    if (!testPhone) {
      toast({
        title: "Error",
        description: "Por favor, ingrese un número de teléfono para la prueba",
        variant: "destructive"
      });
      return;
    }
    
    sendTestMessage.mutate({
      phone: testPhone,
      message: testMessage
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SiWhatsapp className="h-5 w-5" />
            WhatsApp Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SiWhatsapp className="h-5 w-5" />
          WhatsApp Business
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {config?.enabled ? (
            <Alert className="bg-green-50 dark:bg-green-950">
              <AlertTitle className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Integración activa
              </AlertTitle>
              <AlertDescription>
                La integración con WhatsApp está configurada y activa.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 dark:bg-yellow-950">
              <AlertTitle className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                Configuración pendiente
              </AlertTitle>
              <AlertDescription>
                La integración con WhatsApp requiere configuración.
              </AlertDescription>
            </Alert>
          )}

          {!showCredentials && config?.enabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Número de WhatsApp</Label>
                  <div className="text-sm text-muted-foreground">{config.whatsappNumber || "No configurado"}</div>
                </div>
                <Button variant="outline" onClick={() => setShowCredentials(true)}>Cambiar</Button>
              </div>

              <div className="space-y-4">
                <Label>Notificaciones</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div>Pedidos nuevos</div>
                    <div className="text-sm text-muted-foreground">Enviar mensaje cuando se crea un pedido</div>
                  </div>
                  <Switch 
                    checked={orderNotifications} 
                    onCheckedChange={setOrderNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div>Confirmación de pago</div>
                    <div className="text-sm text-muted-foreground">Enviar mensaje cuando se confirma un pago</div>
                  </div>
                  <Switch 
                    checked={paymentNotifications} 
                    onCheckedChange={setPaymentNotifications}
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                    Guardar cambios
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 border-t pt-6 space-y-4">
                <Label>Enviar mensaje de prueba</Label>
                <Input
                  type="text"
                  placeholder="Número de teléfono (con código de país)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Mensaje"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
                <Button 
                  onClick={handleSendTest} 
                  disabled={sendTestMessage.isPending}
                >
                  Enviar prueba
                </Button>
              </div>
            </div>
          )}

          {(showCredentials || !config?.enabled) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <InfoIcon className="h-4 w-4" />
                <span>Las credenciales solo se almacenarán en tu entorno, no se guardan en la base de datos.</span>
              </div>

              <div>
                <Label>Twilio Account SID</Label>
                <Input
                  type="text"
                  value={credentials.accountSid}
                  onChange={(e) => setCredentials({ ...credentials, accountSid: e.target.value })}
                  placeholder="AC..."
                />
              </div>
              <div>
                <Label>Twilio Auth Token</Label>
                <Input
                  type="password"
                  value={credentials.authToken}
                  onChange={(e) => setCredentials({ ...credentials, authToken: e.target.value })}
                  placeholder="Tu token de autenticación de Twilio"
                />
              </div>
              <div>
                <Label>Número de WhatsApp (con código de país)</Label>
                <Input
                  type="text"
                  value={credentials.whatsappNumber || config?.whatsappNumber || ""}
                  onChange={(e) => setCredentials({ ...credentials, whatsappNumber: e.target.value })}
                  placeholder="+521234567890"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Introduce el número completo con código de país, ej: +521234567890
                </p>
              </div>

              <div className="space-y-4">
                <Label>Notificaciones</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div>Pedidos nuevos</div>
                    <div className="text-sm text-muted-foreground">Enviar mensaje cuando se crea un pedido</div>
                  </div>
                  <Switch 
                    checked={orderNotifications} 
                    onCheckedChange={setOrderNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div>Confirmación de pago</div>
                    <div className="text-sm text-muted-foreground">Enviar mensaje cuando se confirma un pago</div>
                  </div>
                  <Switch 
                    checked={paymentNotifications} 
                    onCheckedChange={setPaymentNotifications}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                  Guardar configuración
                </Button>
                {config?.enabled && (
                  <Button variant="outline" onClick={() => setShowCredentials(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}