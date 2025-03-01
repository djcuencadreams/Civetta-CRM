import React, { useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Download, TrendingUp, BarChart3, LineChart } from 'lucide-react';

// Paleta de colores para marcas específicas de Civetta
const BRAND_COLORS: Record<string, string> = {
  "Civetta Sleepwear": "#8b5cf6", // Violeta
  "Civetta Bride": "#ec4899", // Rosa
  "default": "#3b82f6" // Azul para otras marcas
};

interface BrandRevenueProps {
  data: BrandRevenueData[];
  title: string;
  description?: string;
  showComparison?: boolean;
  comparisonData?: BrandRevenueData[];
  comparisonLabel?: string;
  onExport?: () => void;
}

interface BrandRevenueData {
  brand: string;
  revenue: number;
  count: number;
  avgOrder?: number;
  period?: string;
  growth?: number;
}

export function BrandRevenueChart({ 
  data, 
  title, 
  description, 
  showComparison,
  comparisonData,
  comparisonLabel = "Período anterior",
  onExport 
}: BrandRevenueProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'composed'>('composed');
  
  // Procesamos los datos para incluir el valor promedio por orden
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      ...item,
      avgOrder: item.count > 0 ? Math.round(item.revenue / item.count) : 0,
      color: BRAND_COLORS[item.brand] || BRAND_COLORS.default
    }));
  }, [data]);
  
  // Formateador para valores monetarios
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  // Formatear total
  const totalRevenue = processedData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = processedData.reduce((sum, item) => sum + item.count, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  // Comparación de datos si está disponible
  const previousTotalRevenue = comparisonData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const growthPercentage = previousTotalRevenue > 0 
    ? Math.round(((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100) 
    : null;
  
  // Custom tooltip
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    
    if (active && payload && payload.length) {
      // Para gráfico combinado con datos de comparación
      if (showComparison && chartType === 'composed' && payload.length > 1) {
        return (
          <div className="bg-white p-3 shadow-md rounded border border-gray-200">
            <p className="font-semibold">{label}</p>
            <div className="space-y-1 mt-2">
              <p className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[0].color }}></span>
                <span>Actual: </span>
                <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
              </p>
              {payload[1] && (
                <p className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[1].color }}></span>
                  <span>{comparisonLabel}: </span>
                  <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
                </p>
              )}
              {payload.length > 2 && payload[2] && (
                <p className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[2].color }}></span>
                  <span>Pedidos: </span>
                  <span className="font-semibold">{payload[2].value}</span>
                </p>
              )}
            </div>
          </div>
        );
      }
      
      // Para gráficos simples sin comparación
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded border border-gray-200">
          <p className="font-semibold">{data.brand}</p>
          <p>
            Ingresos: <span className="font-semibold">{formatCurrency(data.revenue)}</span>
          </p>
          <p>
            Pedidos: <span className="font-semibold">{data.count}</span>
          </p>
          <p>
            Valor promedio: <span className="font-semibold">{formatCurrency(data.avgOrder)}</span>
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Preparar datos para gráfico con comparación
  const combinedData = showComparison && comparisonData
    ? processedData.map((item, index) => {
        const comparisonItem = comparisonData.find(c => c.brand === item.brand);
        return {
          ...item,
          previousRevenue: comparisonItem ? comparisonItem.revenue : 0,
          previousCount: comparisonItem ? comparisonItem.count : 0,
          growth: comparisonItem ? 
            Math.round(((item.revenue - comparisonItem.revenue) / comparisonItem.revenue) * 100) : 0
        };
      })
    : processedData;
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              {title}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Tabs defaultValue="composed" className="w-42">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="composed" onClick={() => setChartType('composed')}>
                  <TrendingUp className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="bar" onClick={() => setChartType('bar')}>
                  <BarChart3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="line" onClick={() => setChartType('line')}>
                  <LineChart className="h-4 w-4" />
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
              {chartType === 'composed' ? (
                <ComposedChart
                  data={combinedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="brand" 
                    tick={{ fontSize: 12 }} 
                    height={60}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString('es')}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={renderTooltip} />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="revenue" 
                    name="Ingresos" 
                    radius={[4, 4, 0, 0]}
                  >
                    {combinedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  {showComparison && comparisonData && (
                    <Bar 
                      yAxisId="left"
                      dataKey="previousRevenue" 
                      name={comparisonLabel}
                      radius={[4, 4, 0, 0]}
                      fill="#94a3b8"
                      opacity={0.5}
                    />
                  )}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="count"
                    name="Pedidos"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#f59e0b" }}
                  />
                </ComposedChart>
              ) : chartType === 'bar' ? (
                <BarChart
                  data={processedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="brand" 
                    tick={{ fontSize: 12 }} 
                    height={60}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString('es')}`}
                  />
                  <Tooltip content={renderTooltip} />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="Ingresos" 
                    radius={[4, 4, 0, 0]}
                  >
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar 
                    dataKey="avgOrder" 
                    name="Valor promedio"
                    radius={[4, 4, 0, 0]}
                    fill="#10b981"
                  />
                </BarChart>
              ) : (
                <ComposedChart
                  data={combinedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="brand" 
                    tick={{ fontSize: 12 }} 
                    height={60}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString('es')}`}
                  />
                  <Tooltip content={renderTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Ingresos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#3b82f6" }}
                  />
                  {showComparison && comparisonData && (
                    <Line
                      type="monotone"
                      dataKey="previousRevenue"
                      name={comparisonLabel}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: "#94a3b8" }}
                    />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[320px] p-6 text-center border border-dashed rounded-lg">
            <DollarSign className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-muted-foreground mb-2">No hay datos de ingresos disponibles</p>
            <p className="text-xs text-muted-foreground">
              No hay suficiente información para mostrar estadísticas de ingresos
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap md:flex-nowrap gap-y-2 gap-x-4 text-xs text-muted-foreground justify-between">
        <div className="space-x-4 flex">
          <div>
            <span className="font-medium">Total: </span>
            <span className="font-semibold text-green-500">{formatCurrency(totalRevenue)}</span>
          </div>
          <div>
            <span className="font-medium">Valor promedio: </span>
            <span>{formatCurrency(avgOrderValue)}</span>
          </div>
          {growthPercentage !== null && (
            <div>
              <span className="font-medium">Crecimiento: </span>
              <span className={growthPercentage >= 0 ? "text-green-500" : "text-red-500"}>
                {growthPercentage >= 0 ? "+" : ""}{growthPercentage}%
              </span>
            </div>
          )}
        </div>
        <span>Actualizado: {new Date().toLocaleDateString('es-ES')}</span>
      </CardFooter>
    </Card>
  );
}