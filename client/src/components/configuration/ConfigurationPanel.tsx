import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Webhook } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SiSlack, SiWhatsapp, SiZapier, SiWordpress } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleSpreadsheetImporter } from "./SimpleSpreadsheetImporter";
import { WordPressIntegration } from "../integrations/WordPressIntegration";
import { EmailConfiguration } from "./EmailConfiguration";
import { t } from "@/lib/i18n";

export function ConfigurationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", event: "new_sale" });

  const { data: webhooks } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  const createWebhook = useMutation({
    mutationFn: async (data: typeof newWebhook) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setNewWebhook({ name: "", url: "", event: "new_sale" });
      toast({ title: t("common.success") });
    }
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: t("common.success") });
    }
  });

  // Handle WhatsApp configuration
  const handleWhatsAppConfigure = () => {
    toast({
      title: "WhatsApp Business",
      description: "Configuración de WhatsApp Business en progreso.",
    });
  };

  // Handle Slack configuration
  const handleSlackConfigure = () => {
    toast({
      title: "Slack",
      description: "Configuración de Slack en progreso.",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="integrations">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="import">Importación de datos</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiWhatsapp className="h-5 w-5" />
                WhatsApp Business
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Conecta con WhatsApp Business API para enviar notificaciones automáticas.
              </p>
              <Button variant="outline" onClick={handleWhatsAppConfigure}>{t("integrations.configure")}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiSlack className="h-5 w-5" />
                Slack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Recibe notificaciones de ventas en tu canal de Slack.
              </p>
              <Button variant="outline" onClick={handleSlackConfigure}>{t("integrations.configure")}</Button>
            </CardContent>
          </Card>

          {/* Include WordPress integration component */}
          <WordPressIntegration />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiZapier className="h-5 w-5" />
                Zapier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!newWebhook.name || !newWebhook.url) {
                      toast({
                        title: "Error",
                        description: "Por favor, complete todos los campos",
                        variant: "destructive"
                      });
                      return;
                    }
                    createWebhook.mutate(newWebhook);
                  }}
                  disabled={createWebhook.isPending}
                >
                  {t("integrations.addWebhook")}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {webhooks?.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <div className="font-medium">{webhook.name}</div>
                      <div className="text-sm text-muted-foreground">{webhook.url}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook.mutate(webhook.id)}
                      disabled={deleteWebhook.isPending}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          {/* Configuración de Email */}
          <EmailConfiguration />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          {/* Include SpreadsheetImport component */}
          <SimpleSpreadsheetImporter />

          {/* WordPress integration import section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiWordpress className="h-5 w-5" />
                Importar desde WordPress/WooCommerce
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WordPressIntegration />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}