import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BarChart2, PieChart as PieChartIcon, AreaChart, MapPin, Users, DollarSign, TrendingUp } from "lucide-react";

export interface ReportTypeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ReportSelectorProps {
  selectedReportType: string;
  onSelectReportType: (type: string) => void;
  reportTypes: ReportTypeOption[];
}

export function ReportSelector({
  selectedReportType,
  onSelectReportType,
  reportTypes
}: ReportSelectorProps) {
  // Categorías de reportes
  const reportCategories = [
    { id: 'customers', label: 'Clientes' },
    { id: 'sales', label: 'Ventas' },
    { id: 'locations', label: 'Ubicaciones' },
    { id: 'other', label: 'Otros' }
  ];
  
  // Agrupar los tipos de reportes por categoría
  const groupedReports = reportTypes.reduce<Record<string, ReportTypeOption[]>>(
    (groups, report) => {
      // Por defecto asignamos a "other" si no podemos determinar la categoría
      let category = 'other';
      
      if (report.id.includes('customer') || report.id.includes('lead')) {
        category = 'customers';
      } else if (report.id.includes('sale') || report.id.includes('revenue') || report.id.includes('brand')) {
        category = 'sales';
      } else if (report.id.includes('city') || report.id.includes('province') || report.id.includes('location')) {
        category = 'locations';
      }
      
      if (!groups[category]) {
        groups[category] = [];
      }
      
      groups[category].push(report);
      return groups;
    },
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tipo de Informe</CardTitle>
        <CardDescription>
          Seleccione el tipo de informe que desea visualizar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            {reportCategories.map(category => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center gap-1"
              >
                {category.id === 'customers' && <Users className="h-4 w-4" />}
                {category.id === 'sales' && <DollarSign className="h-4 w-4" />}
                {category.id === 'locations' && <MapPin className="h-4 w-4" />}
                {category.id === 'other' && <TrendingUp className="h-4 w-4" />}
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {reportCategories.map(category => (
            <TabsContent key={category.id} value={category.id} className="pt-4">
              <RadioGroup 
                value={selectedReportType} 
                onValueChange={onSelectReportType}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {groupedReports[category.id]?.map(reportType => (
                  <Label
                    key={reportType.id}
                    htmlFor={reportType.id}
                    className={`flex flex-col p-4 rounded-md border-2 transition-all cursor-pointer hover:border-primary ${
                      selectedReportType === reportType.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={reportType.id} id={reportType.id} className="mt-px" />
                        <span className="font-medium">{reportType.name}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {reportType.icon}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground pl-6">
                      {reportType.description}
                    </p>
                  </Label>
                ))}
              </RadioGroup>
              
              {groupedReports[category.id]?.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No hay informes disponibles en esta categoría
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="bg-muted/50 text-xs text-muted-foreground">
        <p>Consejo: Seleccione el tipo de informe para ver estadísticas detalladas</p>
      </CardFooter>
    </Card>
  );
}

// Exportar tipos de informes predefinidos
export const DEFAULT_REPORT_TYPES: ReportTypeOption[] = [
  {
    id: 'sales-by-region',
    name: 'Ventas por Provincia',
    description: 'Análisis de ventas distribuidas por provincias',
    icon: <MapPin className="h-4 w-4" />
  },
  {
    id: 'customers-by-city',
    name: 'Clientes por Ciudad',
    description: 'Distribución de clientes por ciudades',
    icon: <MapPin className="h-4 w-4" />
  },
  {
    id: 'revenue-by-brand',
    name: 'Ingresos por Marca',
    description: 'Ingresos generados por cada marca',
    icon: <DollarSign className="h-4 w-4" />
  },
  {
    id: 'leads-by-source',
    name: 'Leads por Fuente',
    description: 'Origen de los leads capturados',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'customers-by-source',
    name: 'Clientes por Fuente',
    description: 'Origen de adquisición de clientes',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'sales-over-time',
    name: 'Ventas en el Tiempo',
    description: 'Evolución de ventas a lo largo del tiempo',
    icon: <AreaChart className="h-4 w-4" />
  },
  {
    id: 'brand-performance',
    name: 'Rendimiento por Marca',
    description: 'Comparación de rendimiento entre marcas',
    icon: <BarChart2 className="h-4 w-4" />
  },
  {
    id: 'conversion-analysis',
    name: 'Análisis de Conversión',
    description: 'Tasas de conversión de leads a clientes',
    icon: <TrendingUp className="h-4 w-4" />
  }
];