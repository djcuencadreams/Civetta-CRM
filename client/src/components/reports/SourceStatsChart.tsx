import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Download, LucideIcon } from 'lucide-react';
import { SiInstagram, SiFacebook, SiGoogle, SiWhatsapp, SiTiktok } from 'react-icons/si';

// Paleta de colores para gráficos de fuentes
const SOURCE_COLORS: Record<string, string> = {
  "Instagram": "#E1306C", // Color de Instagram
  "Facebook": "#1877F2", // Color de Facebook
  "Google": "#4285F4", // Color de Google
  "Referidos": "#10b981", // Verde esmeralda
  "Sitio Web": "#3b82f6", // Azul
  "WhatsApp": "#25D366", // Color de WhatsApp
  "TikTok": "#000000", // Color de TikTok
  "YouTube": "#FF0000", // Color de YouTube
  "Ferias": "#f59e0b", // Ámbar
  "default": "#6b7280" // Gris para otras fuentes
};

// Íconos para cada fuente
const SOURCE_ICONS: Record<string, React.ReactNode> = {
  "Instagram": <SiInstagram />,
  "Facebook": <SiFacebook />,
  "Google": <SiGoogle />,
  "WhatsApp": <SiWhatsapp />,
  "TikTok": <SiTiktok />
};

interface SourceStatsProps {
  data: SourceData[];
  title: string;
  description?: string;
  dataType: 'leads' | 'customers';
  onExport?: () => void;
}

interface SourceData {
  source: string;
  count: number;
  conversionRate?: number;
  percentage?: number;
}

export function SourceStatsChart({ 
  data, 
  title, 
  description, 
  dataType,
  onExport 
}: SourceStatsProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  // Procesamos los datos para incluir porcentajes
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    return data.map(item => ({
      ...item,
      percentage: Math.round((item.count / total) * 100),
      color: SOURCE_COLORS[item.source] || SOURCE_COLORS.default,
      icon: SOURCE_ICONS[item.source] || null
    })).slice(0, 10); // Limitamos a top 10 para mejor visualización
  }, [data]);

  // Función para obtener el color de la fuente
  const getSourceColor = (source: string) => {
    return SOURCE_COLORS[source] || SOURCE_COLORS.default;
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
        {processedData[index].source} ({percent * 100}%)
      </text>
    );
  };
  
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded border border-gray-200">
          <p className="flex items-center gap-2 font-semibold">
            {data.icon && <span className="text-lg">{data.icon}</span>}
            {data.source}
          </p>
          <p>
            {dataType === 'leads' ? 'Leads: ' : 'Clientes: '}
            <span className="font-semibold">{data.count.toLocaleString('es-ES')}</span>
          </p>
          <p>
            Porcentaje: <span className="font-semibold">{data.percentage}%</span>
          </p>
          {data.conversionRate !== undefined && (
            <p>
              Tasa de conversión: <span className="font-semibold">{data.conversionRate}%</span>
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-pink-500" />
              {title}
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
                    dataKey="count"
                    nameKey="source"
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
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="source" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip content={renderTooltip} />
                  <Bar 
                    dataKey="count" 
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
            <Users className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-muted-foreground mb-2">No hay datos disponibles</p>
            <p className="text-xs text-muted-foreground">
              No hay suficiente información para mostrar estadísticas de fuentes
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground">
        <div>
          {processedData.length > 0 && (
            <>
              <span className="font-medium">Total: </span>
              <span>
                {processedData.reduce((sum, item) => sum + item.count, 0).toLocaleString('es-ES')}
              </span>
            </>
          )}
        </div>
        <span>Actualizado: {new Date().toLocaleDateString('es-ES')}</span>
      </CardFooter>
    </Card>
  );
}