import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { DownloadCloud, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import * as XLSX from 'xlsx';

// Tipos para los datos
type Customer = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  province: string | null;
  brand: string | null;
  source: string | null;
  createdAt: string;
};

type Sale = {
  id: number;
  customerId: number;
  amount: number;
  date: string;
  status: string;
  brand: string | null;
  product: string | null;
  createdAt: string;
};

type Lead = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
  city: string | null;
  province: string | null;
  brand: string | null;
  source: string | null;
  createdAt: string;
};

// Colores para los gráficos
const COLORS = [
  "#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", 
  "#d0ed57", "#ffc658", "#ff8042", "#ff6361", "#bc5090"
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("sales-by-city");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  
  // Cargar datos de clientes
  const customersQuery = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });
  
  // Cargar datos de ventas
  const salesQuery = useQuery<Sale[]>({
    queryKey: ['/api/sales'],
  });
  
  // Cargar datos de leads
  const leadsQuery = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });
  
  const isLoading = customersQuery.isLoading || salesQuery.isLoading || leadsQuery.isLoading;
  const isError = customersQuery.isError || salesQuery.isError || leadsQuery.isError;
  
  // Filtrar ventas por rango de tiempo
  const getFilteredSales = () => {
    if (!salesQuery.data) return [];
    
    const sales = [...salesQuery.data];
    const now = new Date();
    
    if (timeRange === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return sales.filter(sale => new Date(sale.createdAt) >= thirtyDaysAgo);
    }
    if (timeRange === "90days") {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return sales.filter(sale => new Date(sale.createdAt) >= ninetyDaysAgo);
    }
    if (timeRange === "year") {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return sales.filter(sale => new Date(sale.createdAt) >= oneYearAgo);
    }
    
    return sales;
  };
  
  // Filtrar por marca
  const applyBrandFilter = (data: any[]) => {
    if (brandFilter === "all") return data;
    return data.filter(item => item.brand === brandFilter);
  };
  
  // Obtener ventas por ciudad
  const getSalesByCity = () => {
    const sales = getFilteredSales();
    if (!sales.length || !customersQuery.data) return [];
    
    const salesByCity: Record<string, { city: string, total: number, count: number }> = {};
    
    sales.forEach(sale => {
      const customer = customersQuery.data.find(c => c.id === sale.customerId);
      if (!customer || !customer.city) return;
      
      // Filtro de marca
      if (brandFilter !== "all" && sale.brand !== brandFilter) return;
      
      const city = customer.city;
      if (!salesByCity[city]) {
        salesByCity[city] = { city, total: 0, count: 0 };
      }
      
      salesByCity[city].total += sale.amount;
      salesByCity[city].count += 1;
    });
    
    return Object.values(salesByCity)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Tomar las 10 ciudades principales
  };
  
  // Obtener clientes por provincia
  const getCustomersByProvince = () => {
    if (!customersQuery.data) return [];
    
    const filteredCustomers = applyBrandFilter(customersQuery.data);
    
    const customersByProvince: Record<string, { province: string, count: number }> = {};
    
    filteredCustomers.forEach(customer => {
      if (!customer.province) return;
      
      const province = customer.province;
      if (!customersByProvince[province]) {
        customersByProvince[province] = { province, count: 0 };
      }
      
      customersByProvince[province].count += 1;
    });
    
    return Object.values(customersByProvince)
      .sort((a, b) => b.count - a.count);
  };
  
  // Obtener ventas por marca
  const getSalesByBrand = () => {
    const sales = getFilteredSales();
    if (!sales.length) return [];
    
    const salesByBrand: Record<string, { brand: string, total: number, count: number }> = {};
    
    sales.forEach(sale => {
      const brand = sale.brand || "Sin marca";
      
      if (!salesByBrand[brand]) {
        salesByBrand[brand] = { brand, total: 0, count: 0 };
      }
      
      salesByBrand[brand].total += sale.amount;
      salesByBrand[brand].count += 1;
    });
    
    return Object.values(salesByBrand)
      .sort((a, b) => b.total - a.total);
  };
  
  // Obtener leads por origen
  const getLeadsBySource = () => {
    if (!leadsQuery.data) return [];
    
    const filteredLeads = applyBrandFilter(leadsQuery.data);
    
    const leadsBySource: Record<string, { source: string, count: number }> = {};
    
    filteredLeads.forEach(lead => {
      const source = lead.source || "Desconocido";
      
      if (!leadsBySource[source]) {
        leadsBySource[source] = { source, count: 0 };
      }
      
      leadsBySource[source].count += 1;
    });
    
    return Object.values(leadsBySource)
      .sort((a, b) => b.count - a.count);
  };
  
  // Exportar datos a Excel
  const exportToExcel = () => {
    let data: any[] = [];
    let filename = 'reporte.xlsx';
    
    switch (reportType) {
      case "sales-by-city":
        data = getSalesByCity().map(item => ({
          Ciudad: item.city,
          'Ventas Totales': item.total,
          'Número de Ventas': item.count,
          'Promedio por Venta': item.total / item.count
        }));
        filename = 'ventas-por-ciudad.xlsx';
        break;
        
      case "customers-by-province":
        data = getCustomersByProvince().map(item => ({
          Provincia: item.province,
          'Número de Clientes': item.count
        }));
        filename = 'clientes-por-provincia.xlsx';
        break;
        
      case "sales-by-brand":
        data = getSalesByBrand().map(item => ({
          Marca: item.brand,
          'Ventas Totales': item.total,
          'Número de Ventas': item.count,
          'Promedio por Venta': item.total / item.count
        }));
        filename = 'ventas-por-marca.xlsx';
        break;
        
      case "leads-by-source":
        data = getLeadsBySource().map(item => ({
          Origen: item.source,
          'Número de Leads': item.count
        }));
        filename = 'leads-por-origen.xlsx';
        break;
        
      default:
        break;
    }
    
    if (data.length > 0) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Ajustar ancho de columnas
      const colWidths = Object.keys(data[0]).map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      XLSX.writeFile(wb, filename);
    }
  };
  
  // Función para exportar todos los datos
  const exportAllData = () => {
    if (!customersQuery.data || !salesQuery.data || !leadsQuery.data) return;
    
    const wb = XLSX.utils.book_new();
    
    // Exportar clientes
    const customersWs = XLSX.utils.json_to_sheet(customersQuery.data.map(customer => ({
      ID: customer.id,
      Nombre: customer.firstName,
      Apellido: customer.lastName,
      'Nombre Completo': customer.name,
      Email: customer.email || '',
      Ciudad: customer.city || '',
      Provincia: customer.province || '',
      Marca: customer.brand || '',
      Origen: customer.source || '',
      'Fecha de Creación': customer.createdAt
    })));
    XLSX.utils.book_append_sheet(wb, customersWs, 'Clientes');
    
    // Exportar ventas
    const salesWs = XLSX.utils.json_to_sheet(salesQuery.data.map(sale => ({
      ID: sale.id,
      'ID del Cliente': sale.customerId,
      Monto: sale.amount,
      Fecha: sale.date,
      Estado: sale.status,
      Marca: sale.brand || '',
      Producto: sale.product || '',
      'Fecha de Creación': sale.createdAt
    })));
    XLSX.utils.book_append_sheet(wb, salesWs, 'Ventas');
    
    // Exportar leads
    const leadsWs = XLSX.utils.json_to_sheet(leadsQuery.data.map(lead => ({
      ID: lead.id,
      Nombre: lead.firstName,
      Apellido: lead.lastName,
      'Nombre Completo': lead.name,
      Email: lead.email || '',
      Estado: lead.status,
      Ciudad: lead.city || '',
      Provincia: lead.province || '',
      Marca: lead.brand || '',
      Origen: lead.source || '',
      'Fecha de Creación': lead.createdAt
    })));
    XLSX.utils.book_append_sheet(wb, leadsWs, 'Leads');
    
    // Escribir archivo
    XLSX.writeFile(wb, 'civetta-crm-datos-completos.xlsx');
  };
  
  // Renderizar contenido del informe seleccionado
  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }
    
    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos para generar el informe.
          </AlertDescription>
        </Alert>
      );
    }
    
    switch (reportType) {
      case "sales-by-city": {
        const data = getSalesByCity();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ventas por Ciudad</h3>
            <p className="text-sm text-muted-foreground">
              Este informe muestra las ciudades con mayor volumen de ventas.
            </p>
            
            {data.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Bar dataKey="total" name="Total de Ventas" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Alert>
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No hay suficientes datos para generar este informe con los filtros actuales.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      }
      
      case "customers-by-province": {
        const data = getCustomersByProvince();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Clientes por Provincia</h3>
            <p className="text-sm text-muted-foreground">
              Este informe muestra la distribución de clientes por provincia.
            </p>
            
            {data.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="province"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      label={(entry) => `${entry.province}: ${entry.count}`}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} clientes`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Alert>
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No hay suficientes datos para generar este informe con los filtros actuales.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      }
      
      case "sales-by-brand": {
        const data = getSalesByBrand();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ventas por Marca</h3>
            <p className="text-sm text-muted-foreground">
              Este informe muestra las ventas totales por marca.
            </p>
            
            {data.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="brand" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Bar dataKey="total" name="Total de Ventas" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Alert>
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No hay suficientes datos para generar este informe con los filtros actuales.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      }
      
      case "leads-by-source": {
        const data = getLeadsBySource();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Leads por Origen</h3>
            <p className="text-sm text-muted-foreground">
              Este informe muestra la distribución de leads por origen.
            </p>
            
            {data.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      label={(entry) => `${entry.source}: ${entry.count}`}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} leads`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Alert>
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No hay suficientes datos para generar este informe con los filtros actuales.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      }
      
      default:
        return null;
    }
  };
  
  // Obtener lista de marcas únicas para el filtro
  const getBrands = () => {
    const brands = new Set<string>();
    
    customersQuery.data?.forEach(customer => {
      if (customer.brand) brands.add(customer.brand);
    });
    
    salesQuery.data?.forEach(sale => {
      if (sale.brand) brands.add(sale.brand);
    });
    
    leadsQuery.data?.forEach(lead => {
      if (lead.brand) brands.add(lead.brand);
    });
    
    return Array.from(brands);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informes y Análisis</h1>
          <p className="text-muted-foreground">
            Analiza los datos de tu negocio para tomar decisiones informadas.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tipo de Informe</CardTitle>
            <CardDescription>Selecciona el tipo de informe que deseas generar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Informe</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="report-type">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales-by-city">Ventas por Ciudad</SelectItem>
                    <SelectItem value="customers-by-province">Clientes por Provincia</SelectItem>
                    <SelectItem value="sales-by-brand">Ventas por Marca</SelectItem>
                    <SelectItem value="leads-by-source">Leads por Origen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-range">Rango de Tiempo</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger id="time-range">
                    <SelectValue placeholder="Seleccionar rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    <SelectItem value="30days">Últimos 30 días</SelectItem>
                    <SelectItem value="90days">Últimos 90 días</SelectItem>
                    <SelectItem value="year">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand-filter">Filtrar por Marca</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger id="brand-filter">
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {getBrands().map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={exportToExcel}
              disabled={isLoading || isError}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Exportar Informe
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>Visualización de los datos del informe</CardDescription>
          </CardHeader>
          <CardContent>
            {renderReportContent()}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={exportAllData}
              disabled={isLoading || isError}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Exportar Todos los Datos
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReportType("sales-by-city")}
                className={reportType === "sales-by-city" || reportType === "sales-by-brand" ? "bg-muted" : ""}
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReportType("customers-by-province")}
                className={reportType === "customers-by-province" || reportType === "leads-by-source" ? "bg-muted" : ""}
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}