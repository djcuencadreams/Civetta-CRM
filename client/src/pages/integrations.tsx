import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { t } from "@/lib/i18n";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("common.integrations")}
      </h1>
      <IntegrationsPanel />
    </div>
  );
}
