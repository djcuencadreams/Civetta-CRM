import { ConfigurationPanel } from "@/components/configuration/ConfigurationPanel";
import { t } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ConfigurationPage() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-start'}`}>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("common.configuration")}
        </h1>
      </div>
      <ConfigurationPanel />
    </div>
  );
}
