import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, BarChart3, Download } from 'lucide-react';

// Paleta de colores para el mapa - inspirada en colores de Ecuador
const LOCATION_COLORS = [
  "#3b82f6", // Azul 
  "#10b981", // Verde esmeralda
  "#f59e0b", // Ámbar
  "#8b5cf6", // Violeta
  "#ec4899", // Rosa
  "#06b6d4", // Cian
  "#6366f1", // Índigo
  "#a855f7", // Púrpura
  "#14b8a6", // Verde azulado
  "#f43f5e", // Rosa
  "#0ea5e9", // Celeste
  "#84cc16", // Lima
  "#a16207", // Ámbar oscuro
  "#475569", // Gris pizarra
];

interface LocationStatsProps {
  data: LocationData[];
  title: string;
  description?: string;
  type: 'province' | 'city';
  valueType: 'count' | 'revenue';
  onExport?: () => void;
}

interface LocationData {
  name: string;
  count: number;
  revenue?: number;
  percentage?: number;
}

export function LocationStatsChart({ 
  data, 
  title, 
  description, 
  type,
  valueType,
  onExport 
}: LocationStatsProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  // Procesamos los datos para incluir porcentajes y limitar a los principales
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const valueKey = valueType === 'revenue' ? 'revenue' : 'count';
    const total = data.reduce((sum, item) => sum + (valueType === 'revenue' ? (item.revenue || 0) : item.count), 0);
    
    // Ordenamos por el valor seleccionado (cantidad o ingresos)
    const sortedData = [...data].sort((a, b) => {
      const aValue = valueType === 'revenue' ? (a.revenue || 0) : a.count;
      const bValue = valueType === 'revenue' ? (b.revenue || 0) : b.count;
      return bValue - aValue;
    });
    
    // Tomamos los 10 principales y agrupamos el resto como "Otros"
    const topData = sortedData.slice(0, 12);
    
    return topData.map((item, index) => {
      const value = valueType === 'revenue' ? (item.revenue || 0) : item.count;
      return {
        ...item,
        percentage: Math.round((value / total) * 100),
        color: LOCATION_COLORS[index % LOCATION_COLORS.length]
      };
    });
  }, [data, valueType]);
  
  // Formateador para valores monetarios si es necesario
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  // Formatear para el tooltip y etiquetas
  const formatValue = (value: number) => {
    if (valueType === 'revenue') {
      return formatCurrency(value);
    }
    return value.toLocaleString('es-ES');
  };
  
  const customPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.05) return null; // No mostrar etiquetas para elementos pequeños
    
    const RADIAN = Math.PI / 180;
    const radius = 25 + innerRadius + (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={processedData[index].color}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {processedData[index].name} ({percent * 100}%)
      </text>
    );
  };
  
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded border border-gray-200">
          <p className="font-semibold">{data.name}</p>
          <p>
            {valueType === 'revenue' ? 'Ingresos: ' : 'Registros: '}
            <span className="font-semibold">{formatValue(valueType === 'revenue' ? (data.revenue || 0) : data.count)}</span>
          </p>
          <p>
            Porcentaje: <span className="font-semibold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Título dinámico basado en los parámetros
  const dynamicTitle = title || `${type === 'province' ? 'Provincias' : 'Ciudades'} por ${valueType === 'revenue' ? 'Ingresos' : 'Cantidad'}`;
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5 text-blue-500" />
              {dynamicTitle}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Tabs defaultValue="pie" className="w-28">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="pie" onClick={() => setChartType('pie')}>
                  <span className="sr-only">Pastel</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V12L21 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </TabsTrigger>
                <TabsTrigger value="bar" onClick={() => setChartType('bar')}>
                  <span className="sr-only">Barras</span>
                  <BarChart3 className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {onExport && (
              <Button variant="outline" size="icon" onClick={onExport}>
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {processedData.length > 0 ? (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    dataKey={valueType === 'revenue' ? 'revenue' : 'count'}
                    nameKey="name"
                    label={customPieLabel}
                  >
                    {processedData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltip} />
                </PieChart>
              ) : (
                <BarChart
                  data={processedData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => valueType === 'revenue' 
                      ? `$${value.toLocaleString('es')}` 
                      : value.toLocaleString('es-ES')
                    } 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip content={renderTooltip} />
                  <Bar 
                    dataKey={valueType === 'revenue' ? 'revenue' : 'count'} 
                    radius={[0, 4, 4, 0]}
                  >
                    {processedData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[320px] p-6 text-center border border-dashed rounded-lg">
            <MapPin className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-muted-foreground mb-2">No hay datos de ubicación disponibles</p>
            <p className="text-xs text-muted-foreground">
              No hay suficiente información para mostrar estadísticas de ubicación
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground">
        <div>
          {processedData.length > 0 && (
            <>
              <span className="font-medium">Total {type === 'province' ? 'provincias' : 'ciudades'}: </span>
              <span>
                {processedData.length}
              </span>
            </>
          )}
        </div>
        <span>Actualizado: {new Date().toLocaleDateString('es-ES')}</span>
      </CardFooter>
    </Card>
  );
}