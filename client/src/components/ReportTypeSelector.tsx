import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart2, PieChart, LineChart, Sliders } from "lucide-react";

// Definición común de los tipos de reportes
export const REPORT_TYPES = {
  SALES_BY_CITY: "sales-by-city",
  CUSTOMERS_BY_PROVINCE: "customers-by-province",
  SALES_BY_BRAND: "sales-by-brand",
  LEADS_BY_SOURCE: "leads-by-source",
  SALES_OVER_TIME: "sales-over-time",
  CUSTOM: "custom"
};

interface ReportTypeSelectorProps {
  currentType: string;
  onSelectType: (type: string) => void;
  onCustomClick?: () => void; // Acción opcional para informes personalizados
  compact?: boolean;
}

/**
 * Componente para seleccionar el tipo de reporte a visualizar
 */
export function ReportTypeSelector({ 
  currentType, 
  onSelectType,
  onCustomClick,
  compact = false
}: ReportTypeSelectorProps) {
  
  // Manejar clic en informes personalizados con acción adicional si se proporciona
  const handleCustomClick = () => {
    onSelectType(REPORT_TYPES.CUSTOM);
    if (onCustomClick) {
      onCustomClick();
    }
  };
  
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'scale-90' : ''}`}>
      <Button 
        variant={currentType === REPORT_TYPES.SALES_BY_CITY ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => onSelectType(REPORT_TYPES.SALES_BY_CITY)}
      >
        <BarChart2 className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        Ventas por Ciudad
      </Button>
      
      <Button 
        variant={currentType === REPORT_TYPES.CUSTOMERS_BY_PROVINCE ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => onSelectType(REPORT_TYPES.CUSTOMERS_BY_PROVINCE)}
      >
        <PieChart className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        Clientes por Provincia
      </Button>
      
      <Button 
        variant={currentType === REPORT_TYPES.SALES_BY_BRAND ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => onSelectType(REPORT_TYPES.SALES_BY_BRAND)}
      >
        <BarChart2 className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        Ventas por Marca
      </Button>
      
      <Button 
        variant={currentType === REPORT_TYPES.LEADS_BY_SOURCE ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => onSelectType(REPORT_TYPES.LEADS_BY_SOURCE)}
      >
        <PieChart className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        Leads por Origen
      </Button>
      
      <Button 
        variant={currentType === REPORT_TYPES.SALES_OVER_TIME ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => onSelectType(REPORT_TYPES.SALES_OVER_TIME)}
      >
        <LineChart className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        Ventas en el Tiempo
      </Button>
      
      <Button 
        variant={currentType === REPORT_TYPES.CUSTOM ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={handleCustomClick}
      >
        <Sliders className={`${compact ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
        {compact ? "Personalizado" : "Informe Personalizado"}
      </Button>
    </div>
  );
}