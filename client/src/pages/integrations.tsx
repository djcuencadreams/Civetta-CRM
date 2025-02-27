import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { t } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

export default function IntegrationsPage() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-start'}`}>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("common.integrations")}
        </h1>
      </div>
      <IntegrationsPanel />
    </div>
  );
}