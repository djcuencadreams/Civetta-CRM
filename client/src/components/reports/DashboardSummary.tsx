import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Users, UserCheck, ShoppingBag, DollarSign, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";

interface DashboardSummaryProps {
  metrics: {
    totalCustomers: number;
    totalLeads: number;
    totalSales: number;
    totalRevenue: number;
    avgOrderValue: number;
    conversionRate: number;
    activeLeads: number;
    newCustomers: number;
    periodsCompared?: string;
    customerGrowth?: number;
    leadsGrowth?: number;
    salesGrowth?: number;
    revenueGrowth?: number;
  };
}

export function DashboardSummary({ metrics }: DashboardSummaryProps) {
  // Formateadores para los diferentes tipos de datos
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  const formatNumber = (value: number) => {
    return value.toLocaleString('es-ES');
  };
  
  // Renderizar indicador de tendencia
  const renderTrend = (value: number | undefined) => {
    if (value === undefined) return <HelpCircle className="h-4 w-4 text-gray-400" />;
    
    if (value > 0) {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>+{value}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>{value}%</span>
        </div>
      );
    }
    
    return <span className="text-gray-500">0%</span>;
  };
  
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* Tarjeta de Clientes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalCustomers)}</div>
          <div className="flex items-center pt-1 text-xs text-muted-foreground">
            {renderTrend(metrics.customerGrowth)}
            <span className="ml-1">vs. período anterior</span>
          </div>
        </CardContent>
        <CardFooter className="p-2 px-4 border-t text-xs flex justify-between">
          <div className="text-muted-foreground">Nuevos: {formatNumber(metrics.newCustomers)}</div>
          <Badge variant="outline" className="font-normal bg-blue-50">
            <CalendarRange className="h-3 w-3 mr-1" /> 30 días
          </Badge>
        </CardFooter>
      </Card>
      
      {/* Tarjeta de Leads */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Leads Activos</CardTitle>
          <UserCheck className="h-4 w-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalLeads)}</div>
          <div className="flex items-center pt-1 text-xs text-muted-foreground">
            {renderTrend(metrics.leadsGrowth)}
            <span className="ml-1">vs. período anterior</span>
          </div>
        </CardContent>
        <CardFooter className="p-2 px-4 border-t text-xs flex justify-between">
          <div className="text-muted-foreground">
            Tasa de conversión: <span className="font-medium">{formatPercent(metrics.conversionRate)}</span>
          </div>
          <Badge variant="outline" className="font-normal bg-indigo-50">
            <CalendarRange className="h-3 w-3 mr-1" /> 30 días
          </Badge>
        </CardFooter>
      </Card>
      
      {/* Tarjeta de Ventas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Total de Ventas</CardTitle>
          <ShoppingBag className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalSales)}</div>
          <div className="flex items-center pt-1 text-xs text-muted-foreground">
            {renderTrend(metrics.salesGrowth)}
            <span className="ml-1">vs. período anterior</span>
          </div>
        </CardContent>
        <CardFooter className="p-2 px-4 border-t text-xs flex justify-between">
          <div className="text-muted-foreground">
            Valor promedio: <span className="font-medium">{formatCurrency(metrics.avgOrderValue)}</span>
          </div>
          <Badge variant="outline" className="font-normal bg-orange-50">
            <CalendarRange className="h-3 w-3 mr-1" /> 30 días
          </Badge>
        </CardFooter>
      </Card>
      
      {/* Tarjeta de Ingresos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          <div className="flex items-center pt-1 text-xs text-muted-foreground">
            {renderTrend(metrics.revenueGrowth)}
            <span className="ml-1">vs. período anterior</span>
          </div>
        </CardContent>
        <CardFooter className="p-2 px-4 border-t text-xs flex justify-between">
          <div className="text-muted-foreground">
            {metrics.totalSales > 0 
              ? `${formatNumber(metrics.totalSales)} ventas totales`
              : "Sin ventas en el período"}
          </div>
          <Badge variant="outline" className="font-normal bg-green-50">
            <CalendarRange className="h-3 w-3 mr-1" /> 30 días
          </Badge>
        </CardFooter>
      </Card>
    </div>
  );
}