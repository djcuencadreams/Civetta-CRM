import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MdOutlineEmail } from "react-icons/md";
import { SiSendgrid } from "react-icons/si";
import { FaServer } from "react-icons/fa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { t } from "@/lib/i18n";

// Tipo para la configuración de email
interface EmailConfig {
  provider: 'sendgrid' | 'smtp';
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  enabled: boolean;
  welcomeEmailEnabled: boolean;
  orderConfirmationEnabled: boolean;
  // Indicadores de si las credenciales están configuradas (no las credenciales en sí)
  hasSendgridKey?: boolean;
  hasSmtpCredentials?: boolean;
}

// Tipo para las credenciales a enviar al servidor
interface EmailCredentials {
  provider: 'sendgrid' | 'smtp';
  sendgridApiKey?: string;
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  enabled?: boolean;
  welcomeEmailEnabled?: boolean;
  orderConfirmationEnabled?: boolean;
}

export function EmailConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [credentials, setCredentials] = useState<EmailCredentials>({
    provider: 'sendgrid',
    sendgridApiKey: "",
    emailFrom: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
  });

  const { data: config, isLoading } = useQuery<EmailConfig>({
    queryKey: ["/api/configuration/email"],
    onSuccess: (data) => {
      // Solo actualizamos los campos no sensibles
      setCredentials(prev => ({
        ...prev,
        provider: data.provider,
        emailFrom: data.emailFrom || prev.emailFrom,
        smtpHost: data.smtpHost || prev.smtpHost,
        smtpPort: data.smtpPort || prev.smtpPort,
        smtpUser: data.smtpUser || prev.smtpUser,
        enabled: data.enabled,
        welcomeEmailEnabled: data.welcomeEmailEnabled,
        orderConfirmationEnabled: data.orderConfirmationEnabled,
      }));
    }
  });

  const updateConfig = useMutation({
    mutationFn: async (data: EmailCredentials) => {
      const res = await apiRequest("POST", "/api/configuration/email", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration/email"] });
      toast({ 
        title: "Configuración actualizada", 
        description: "La configuración de email ha sido actualizada."
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `No se pudo actualizar la configuración: ${error}`,
        variant: "destructive"
      });
    }
  });

  const sendTestEmail = useMutation({
    mutationFn: async (data: { to: string, template: string }) => {
      const res = await apiRequest("POST", "/api/configuration/email/test", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Email enviado", 
        description: "El email de prueba ha sido enviado correctamente."
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `No se pudo enviar el email de prueba: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleUpdateConfig = (provider: 'sendgrid' | 'smtp') => {
    const dataToSend: EmailCredentials = {
      ...credentials,
      provider,
    };

    // Limpiar campos que no corresponden al proveedor seleccionado
    if (provider === 'sendgrid') {
      delete dataToSend.smtpHost;
      delete dataToSend.smtpPort;
      delete dataToSend.smtpUser;
      delete dataToSend.smtpPass;
    } else {
      delete dataToSend.sendgridApiKey;
    }

    updateConfig.mutate(dataToSend);
  };

  const handleSendTestEmail = (template: string) => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Por favor, ingrese una dirección de email válida para la prueba.",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({
        title: "Error",
        description: "Por favor, ingrese una dirección de email válida.",
        variant: "destructive"
      });
      return;
    }

    sendTestEmail.mutate({ 
      to: testEmail,
      template
    });
  };

  if (isLoading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MdOutlineEmail className="h-5 w-5" />
          Configuración de Email
        </CardTitle>
        <CardDescription>
          Configure el servicio de email para enviar notificaciones automáticas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={config?.provider || "sendgrid"}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="sendgrid" className="flex items-center gap-2">
              <SiSendgrid className="h-4 w-4" />
              SendGrid
            </TabsTrigger>
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <FaServer className="h-4 w-4" />
              SMTP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sendgrid" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>API Key de SendGrid</Label>
                <Input
                  type="password"
                  placeholder={config?.hasSendgridKey ? "••••••••••••••••••••••" : "Ingrese su API Key de SendGrid"}
                  value={credentials.sendgridApiKey}
                  onChange={(e) => setCredentials({ ...credentials, sendgridApiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config?.hasSendgridKey 
                    ? "API Key configurada. Deje en blanco para mantener el valor actual." 
                    : "Obtenga su API Key en https://app.sendgrid.com/settings/api_keys"}
                </p>
              </div>

              <div>
                <Label>Email Remitente</Label>
                <Input
                  placeholder="noreply@tuempresa.com"
                  value={credentials.emailFrom}
                  onChange={(e) => setCredentials({ ...credentials, emailFrom: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dirección de email desde la que se enviarán los correos. Debe estar verificada en SendGrid.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.enabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, enabled: checked })}
                />
                <Label>Activar envío de emails</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.welcomeEmailEnabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, welcomeEmailEnabled: checked })}
                />
                <Label>Enviar email de bienvenida a nuevos leads</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.orderConfirmationEnabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, orderConfirmationEnabled: checked })}
                />
                <Label>Enviar confirmación de pedidos</Label>
              </div>

              <Button 
                onClick={() => handleUpdateConfig('sendgrid')}
                disabled={updateConfig.isPending}
                className="mt-4"
              >
                Guardar configuración
              </Button>
            </div>

            {config?.hasSendgridKey && (
              <div className="space-y-4 mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium">Enviar email de prueba</h3>
                <div>
                  <Label>Email de destino</Label>
                  <Input
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleSendTestEmail('welcome')}
                    disabled={sendTestEmail.isPending}
                  >
                    Probar email de bienvenida
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleSendTestEmail('order-confirmation')}
                    disabled={sendTestEmail.isPending}
                  >
                    Probar confirmación de pedido
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Servidor SMTP</Label>
                <Input
                  placeholder="smtp.tuservidor.com"
                  value={credentials.smtpHost}
                  onChange={(e) => setCredentials({ ...credentials, smtpHost: e.target.value })}
                />
              </div>

              <div>
                <Label>Puerto SMTP</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={credentials.smtpPort?.toString()}
                  onChange={(e) => setCredentials({ ...credentials, smtpPort: parseInt(e.target.value) || 587 })}
                />
              </div>

              <div>
                <Label>Usuario SMTP</Label>
                <Input
                  placeholder="usuario@tuservidor.com"
                  value={credentials.smtpUser}
                  onChange={(e) => setCredentials({ ...credentials, smtpUser: e.target.value })}
                />
              </div>

              <div>
                <Label>Contraseña SMTP</Label>
                <Input
                  type="password"
                  placeholder={config?.hasSmtpCredentials ? "••••••••••••••••••••••" : "Contraseña"}
                  value={credentials.smtpPass}
                  onChange={(e) => setCredentials({ ...credentials, smtpPass: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config?.hasSmtpCredentials 
                    ? "Contraseña configurada. Deje en blanco para mantener el valor actual." 
                    : "Ingrese la contraseña para su cuenta SMTP"}
                </p>
              </div>

              <div>
                <Label>Email Remitente</Label>
                <Input
                  placeholder="noreply@tuempresa.com"
                  value={credentials.emailFrom}
                  onChange={(e) => setCredentials({ ...credentials, emailFrom: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.enabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, enabled: checked })}
                />
                <Label>Activar envío de emails</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.welcomeEmailEnabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, welcomeEmailEnabled: checked })}
                />
                <Label>Enviar email de bienvenida a nuevos leads</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.orderConfirmationEnabled}
                  onCheckedChange={(checked) => setCredentials({ ...credentials, orderConfirmationEnabled: checked })}
                />
                <Label>Enviar confirmación de pedidos</Label>
              </div>

              <Button 
                onClick={() => handleUpdateConfig('smtp')}
                disabled={updateConfig.isPending}
                className="mt-4"
              >
                Guardar configuración
              </Button>
            </div>

            {config?.hasSmtpCredentials && (
              <div className="space-y-4 mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium">Enviar email de prueba</h3>
                <div>
                  <Label>Email de destino</Label>
                  <Input
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleSendTestEmail('welcome')}
                    disabled={sendTestEmail.isPending}
                  >
                    Probar email de bienvenida
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleSendTestEmail('order-confirmation')}
                    disabled={sendTestEmail.isPending}
                  >
                    Probar confirmación de pedido
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {!config?.enabled && (
          <Alert className="mt-6">
            <AlertTitle>Servicio de email desactivado</AlertTitle>
            <AlertDescription>
              El servicio de email está desactivado. Active el servicio y configure las credenciales para enviar emails automáticos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}