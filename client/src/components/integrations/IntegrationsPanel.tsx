import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Webhook } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SiSlack, SiWhatsapp, SiZapier } from "react-icons/si";

export function IntegrationsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", event: "new_sale" });
  
  const { data: webhooks } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"]
  });

  const createWebhook = useMutation({
    mutationFn: async (values: typeof newWebhook) => {
      const res = await apiRequest("POST", "/api/webhooks", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: t("common.success") });
      setNewWebhook({ name: "", url: "", event: "new_sale" });
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

  return (
    <div className="space-y-6">
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
          <Button variant="outline">{t("integrations.configure")}</Button>
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
          <Button variant="outline">{t("integrations.configure")}</Button>
        </CardContent>
      </Card>

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
              onClick={() => createWebhook.mutate(newWebhook)}
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
    </div>
  );
}
