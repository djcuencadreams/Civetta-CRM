import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { BarChart3, LineChart as LineChartIcon, TrendingUp } from "lucide-react";

// Paleta de colores para Civetta - mejorada para informes
const CHART_COLORS = {
  primary: "#8b5cf6",       // Violeta principal (Civetta Sleepwear)
  secondary: "#ec4899",     // Rosa (Civetta Bride)
  accent: "#3b82f6",        // Azul
  success: "#10b981",       // Verde
  warning: "#f59e0b",       // Ámbar/Naranja
  lightPrimary: "#c4b5fd",  // Violeta claro
  lightSecondary: "#f9a8d4", // Rosa claro
};

interface TimeSeriesChartProps {
  data: {
    date: string;
    total: number;
    count: number;
    monthSort: number;
  }[];
}

/**
 * Un componente de gráfico compuesto para series temporales de ventas
 */
export function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const [chartType, setChartType] = useState<'combined' | 'area' | 'bar' | 'line'>('combined');
  
  // Calculate average per sale
  const dataWithAverage = data.map(item => ({
    ...item,
    average: item.count > 0 ? Math.round(item.total / item.count) : 0
  }));
  
  // Custom tooltip formatter
  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={dataWithAverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`} 
            />
            <Tooltip 
              formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke={CHART_COLORS.primary} 
              fill={CHART_COLORS.primary}
              fillOpacity={0.6}
              name="Ventas totales" 
              activeDot={{ r: 6 }} 
            />
          </AreaChart>
        );
        
      case 'bar':
        return (
          <BarChart data={dataWithAverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`} 
            />
            <Tooltip 
              formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="total" 
              name="Ventas totales" 
              fill={CHART_COLORS.primary} 
              barSize={30}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="average" 
              name="Promedio por venta" 
              fill={CHART_COLORS.success} 
              barSize={30}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
        
      case 'line':
        return (
          <LineChart data={dataWithAverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`} 
            />
            <Tooltip 
              formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke={CHART_COLORS.primary} 
              strokeWidth={2}
              name="Ventas totales" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="average" 
              stroke={CHART_COLORS.success} 
              strokeWidth={2}
              name="Promedio por venta" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        );
        
      default: // combined
        return (
          <ComposedChart data={dataWithAverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`}
              orientation="left"
            />
            <YAxis 
              yAxisId="right"
              tick={{ fontSize: 12 }} 
              tickCount={5}
              orientation="right"
              domain={[0, 'dataMax + 5']}
            />
            <Tooltip 
              formatter={(value: number, name) => {
                if (name === "Número de ventas") {
                  return [value.toLocaleString('es-ES'), name];
                }
                return [formatTooltipValue(value), name];
              }}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="total" 
              fill={CHART_COLORS.primary} 
              stroke={CHART_COLORS.primary}
              fillOpacity={0.6}
              name="Ventas totales" 
            />
            <Bar 
              yAxisId="right"
              dataKey="count" 
              fill={CHART_COLORS.warning} 
              name="Número de ventas" 
              barSize={20}
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="average" 
              stroke={CHART_COLORS.secondary} 
              strokeWidth={2}
              name="Promedio por venta" 
              dot={{ r: 3 }}
            />
          </ComposedChart>
        );
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ventas a lo largo del tiempo</h3>
        <div className="flex space-x-1">
          <Toggle
            pressed={chartType === 'combined'}
            onPressedChange={() => setChartType('combined')}
            aria-label="Gráfico combinado"
            size="sm"
          >
            <TrendingUp className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={chartType === 'area'}
            onPressedChange={() => setChartType('area')}
            aria-label="Gráfico de área"
            size="sm"
          >
            <BarChart3 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={chartType === 'bar'}
            onPressedChange={() => setChartType('bar')}
            aria-label="Gráfico de barras"
            size="sm"
          >
            <BarChart3 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={chartType === 'line'}
            onPressedChange={() => setChartType('line')}
            aria-label="Gráfico de líneas"
            size="sm"
          >
            <LineChartIcon className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        {data.length > 0 
          ? `Mostrando datos de ${data.length} períodos de tiempo. Última actualización: ${new Date().toLocaleDateString('es-ES')}`
          : 'No hay datos disponibles para mostrar'
        }
      </div>
    </div>
  );
}