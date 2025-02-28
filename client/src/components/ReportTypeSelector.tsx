import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  BarChart2, 
  PieChart, 
  LineChart, 
  MapPin, 
  BarChart, 
  Tag
} from "lucide-react";

interface ReportTypeSelectorProps {
  currentType: string;
  onSelectType: (type: string) => void;
}

/**
 * Componente para selección rápida de tipos de informes
 */
export function ReportTypeSelector({ 
  currentType,
  onSelectType
}: ReportTypeSelectorProps) {
  
  const reportTypes = [
    { id: 'sales-by-city', icon: MapPin, label: 'Ventas por Ciudad' },
    { id: 'sales-by-brand', icon: Tag, label: 'Ventas por Marca' },
    { id: 'customers-by-province', icon: PieChart, label: 'Clientes por Provincia' },
    { id: 'leads-by-source', icon: BarChart, label: 'Leads por Origen' },
    { id: 'sales-over-time', icon: LineChart, label: 'Ventas Temporales' }
  ];
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {reportTypes.map(type => {
        const Icon = type.icon;
        return (
          <Button 
            key={type.id}
            variant={currentType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectType(type.id)}
            className={`transition-all duration-300 ${
              currentType === type.id 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-muted"
            }`}
          >
            <Icon className={`mr-2 h-4 w-4 ${
              currentType === type.id ? "animate-pulse" : ""
            }`} />
            {type.label}
          </Button>
        );
      })}
    </div>
  );
}