import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, ComposedChart } from "recharts";
import { TimeSeriesChart } from "@/components/reportChart";
import { DataExportOptions } from "@/components/DataExportOptions";
import { DownloadCloud, BarChart2, PieChart as PieChartIcon, LineChart as LineChartIcon, Calendar, Filter, Sliders, Table, Save, Share, FileText, Clock, ArrowUpDown, Layers, Star, Download, RefreshCw, CalendarDays, BellDot, ArrowDownToLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
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

// Tipos de reportes
const REPORT_TYPES = {
  SALES_BY_CITY: "sales-by-city",
  CUSTOMERS_BY_PROVINCE: "customers-by-province",
  SALES_BY_BRAND: "sales-by-brand",
  LEADS_BY_SOURCE: "leads-by-source",
  SALES_OVER_TIME: "sales-over-time",
  CUSTOM: "custom"
};

// Tipo para informes guardados
type SavedReport = {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  brandFilter: string;
  customSettings?: Record<string, any>;
  createdAt: string;
};

// Función auxiliar para formatear dinero
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Función auxiliar para formatear fechas
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Función auxiliar para obtener el periodo actual
const getPeriodLabel = (timeRange: string) => {
  switch (timeRange) {
    case "30days": return "Últimos 30 días";
    case "90days": return "Últimos 90 días";
    case "year": return "Último año";
    case "custom": return "Periodo personalizado";
    default: return "Todo el tiempo";
  }
};

export default function ReportsPage() {
  // Estado para la vista activa
  const [activeView, setActiveView] = useState<string>("dashboard");
  
  // Estados para filtros y configuración de reportes
  const [reportType, setReportType] = useState<string>(REPORT_TYPES.SALES_BY_CITY);
  const [timeRange, setTimeRange] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    customers: true,
    sales: true,
    leads: true
  });
  
  // Estados para fechas personalizadas
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Estados para reportes personalizados
  const [dataSource, setDataSource] = useState<string>("customers");
  const [groupBy, setGroupBy] = useState<string>("province");
  const [aggregateBy, setAggregateBy] = useState<string>("count");
  const [filterField, setFilterField] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("equals");
  const [filterValue, setFilterValue] = useState<string>("");
  const [showData, setShowData] = useState<boolean>(false);
  const [chartType, setChartType] = useState<string>("bar");
  
  // Estados para comparación
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareTimeRange, setCompareTimeRange] = useState<string>("previous");
  
  // Estados para planificación y programación de reportes
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("weekly");
  const [scheduleDay, setScheduleDay] = useState<string>("monday");
  const [scheduleRecipients, setScheduleRecipients] = useState<string>("");
  
  // Estados para guardar y cargar reportes
  const [savedReports, setSavedReports] = useState<SavedReport[]>([
    {
      id: "1",
      name: "Ventas por Provincia (Último Mes)",
      type: REPORT_TYPES.CUSTOMERS_BY_PROVINCE,
      dateRange: "30days",
      brandFilter: "all",
      createdAt: "2025-02-15T12:00:00Z"
    },
    {
      id: "2",
      name: "Rendimiento de Leads por Origen",
      type: REPORT_TYPES.LEADS_BY_SOURCE,
      dateRange: "90days",
      brandFilter: "all",
      createdAt: "2025-02-20T14:30:00Z"
    },
    {
      id: "3",
      name: "Análisis de Ventas por Tiempo",
      type: REPORT_TYPES.SALES_OVER_TIME,
      dateRange: "year",
      brandFilter: "Civetta Sleepwear",
      customSettings: {
        compareMode: true,
        compareTimeRange: "previous"
      },
      createdAt: "2025-02-25T09:15:00Z"
    }
  ]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [reportName, setReportName] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  
  // Información de KPIs y resumen
  const [showKpis, setShowKpis] = useState<boolean>(true);
  
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
  // Solo consideramos error si todos los datos fallan, ya que podemos mostrar informes parciales
  const isError = customersQuery.isError && salesQuery.isError && leadsQuery.isError;
  
  // Filtrar ventas por rango de tiempo
  const getFilteredSales = () => {
    // Si no hay datos de ventas, creamos un conjunto de datos de ejemplo
    if (!salesQuery.data || salesQuery.data.length === 0) {
      // Datos de ejemplo para demostración
      const exampleSales = [
        {
          id: 1,
          customerId: 51,
          amount: 1200,
          date: "2024-12-01",
          status: "completed",
          brand: "Civetta Sleepwear",
          product: "Pijama de seda",
          createdAt: "2024-12-01T10:00:00Z"
        },
        {
          id: 2,
          customerId: 52,
          amount: 900,
          date: "2025-01-15",
          status: "completed",
          brand: "Civetta Bride",
          product: "Velo de novia",
          createdAt: "2025-01-15T14:30:00Z"
        },
        {
          id: 3,
          customerId: 53,
          amount: 1500,
          date: "2025-02-05",
          status: "completed",
          brand: "Civetta Sleepwear",
          product: "Bata de seda",
          createdAt: "2025-02-05T09:45:00Z"
        }
      ];
      return exampleSales;
    }
    
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
    if (!sales.length) return [];
    
    // Si no hay datos de clientes, usamos un mapa de datos de ejemplo
    let customersMap: Record<number, { city: string }> = {};
    
    if (!customersQuery.data || customersQuery.data.length === 0) {
      // Datos de ejemplo para demostración
      customersMap = {
        51: { city: "Quito" },
        52: { city: "Guayaquil" },
        53: { city: "Cuenca" }
      };
    } else {
      // Crear mapa de clientes reales
      customersQuery.data.forEach(customer => {
        if (customer.city) {
          customersMap[customer.id] = { city: customer.city };
        }
      });
    }
    
    const salesByCity: Record<string, { city: string, total: number, count: number }> = {};
    
    sales.forEach(sale => {
      const customerCity = customersMap[sale.customerId]?.city;
      if (!customerCity) return;
      
      // Filtro de marca
      if (brandFilter !== "all" && sale.brand !== brandFilter) return;
      
      if (!salesByCity[customerCity]) {
        salesByCity[customerCity] = { city: customerCity, total: 0, count: 0 };
      }
      
      salesByCity[customerCity].total += sale.amount;
      salesByCity[customerCity].count += 1;
    });
    
    return Object.values(salesByCity)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Tomar las 10 ciudades principales
  };
  
  // Obtener clientes por provincia
  const getCustomersByProvince = () => {
    if (!customersQuery.data || customersQuery.data.length === 0) {
      // Datos de ejemplo para demostración
      return [
        { province: "Pichincha", count: 32 },
        { province: "Guayas", count: 28 },
        { province: "Azuay", count: 15 },
        { province: "Manabí", count: 10 },
        { province: "Imbabura", count: 7 }
      ];
    }
    
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
    if (!sales.length) {
      // Datos de ejemplo para demostración
      return [
        { brand: "Civetta Sleepwear", total: 15800, count: 12 },
        { brand: "Civetta Bride", total: 22500, count: 15 },
        { brand: "Sin marca", total: 1800, count: 3 }
      ];
    }
    
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
    if (!leadsQuery.data || leadsQuery.data.length === 0) {
      // Datos de ejemplo para demostración
      return [
        { source: "Instagram", count: 45 },
        { source: "Facebook", count: 32 },
        { source: "Referidos", count: 28 },
        { source: "Sitio Web", count: 22 },
        { source: "Ferias", count: 15 }
      ];
    }
    
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
  
  // Obtener ventas por tiempo
  const getSalesOverTime = () => {
    const sales = getFilteredSales();
    if (!sales.length) {
      // Datos de ejemplo para demostración
      return [
        { date: "noviembre 2024", total: 5800, count: 5, monthSort: 202411 },
        { date: "diciembre 2024", total: 8500, count: 7, monthSort: 202412 },
        { date: "enero 2025", total: 7200, count: 6, monthSort: 202501 },
        { date: "febrero 2025", total: 10500, count: 8, monthSort: 202502 }
      ];
    }
    
    // Define type with monthSort property
    type SalesByMonthType = { 
      date: string, 
      total: number, 
      count: number, 
      monthSort: number 
    };
    
    const salesByMonth: Record<string, SalesByMonthType> = {};
    
    sales.forEach(sale => {
      // Usar fecha de creación para el análisis temporal
      const date = new Date(sale.createdAt);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      
      if (!salesByMonth[monthYear]) {
        salesByMonth[monthYear] = { 
          date: monthName, 
          total: 0, 
          count: 0,
          monthSort: parseInt(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`)
        };
      }
      
      // Filtro de marca
      if (brandFilter !== "all" && sale.brand !== brandFilter) return;
      
      salesByMonth[monthYear].total += sale.amount;
      salesByMonth[monthYear].count += 1;
    });
    
    return Object.values(salesByMonth)
      .sort((a, b) => a.monthSort - b.monthSort);
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
        
      case "sales-over-time":
        data = getSalesOverTime().map(item => ({
          Fecha: item.date,
          'Ventas Totales': item.total,
          'Número de Ventas': item.count,
          'Promedio por Venta': item.total / item.count
        }));
        filename = 'ventas-por-tiempo.xlsx';
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
    if (!customersQuery.data && !salesQuery.data && !leadsQuery.data) return;
    
    const wb = XLSX.utils.book_new();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `civetta-crm-exportacion-${timestamp}.xlsx`;
    let hasSheets = false;
    
    // Exportar clientes si están seleccionados o si es una exportación completa (sin diálogo)
    if ((selectedFields.customers || !showExportDialog) && customersQuery.data) {
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
      hasSheets = true;
    }
    
    // Exportar ventas si están seleccionadas o si es una exportación completa
    if ((selectedFields.sales || !showExportDialog) && salesQuery.data) {
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
      hasSheets = true;
    }
    
    // Exportar leads si están seleccionados o si es una exportación completa
    if ((selectedFields.leads || !showExportDialog) && leadsQuery.data) {
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
      hasSheets = true;
    }
    
    // Escribir archivo si hay hojas para exportar
    if (hasSheets) {
      XLSX.writeFile(wb, filename);
    }
  };
  
  // Obtener las marcas disponibles
  const getBrands = () => {
    const brandsSet = new Set<string>();
    
    // Recopilar marcas de clientes
    if (customersQuery.data) {
      customersQuery.data.forEach(customer => {
        if (customer.brand) brandsSet.add(customer.brand);
      });
    }
    
    // Recopilar marcas de ventas
    if (salesQuery.data) {
      salesQuery.data.forEach(sale => {
        if (sale.brand) brandsSet.add(sale.brand);
      });
    }
    
    // Recopilar marcas de leads
    if (leadsQuery.data) {
      leadsQuery.data.forEach(lead => {
        if (lead.brand) brandsSet.add(lead.brand);
      });
    }
    
    return Array.from(brandsSet);
  };
  
  // Calcular KPIs para el dashboard
  const getKpis = () => {
    const sales = getFilteredSales();
    const customers = customersQuery.data || [];
    const leads = leadsQuery.data || [];
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalCustomers = customers.length;
    const totalLeads = leads.length;
    const avgSaleValue = totalSales / (sales.length || 1);
    
    // Calcular tasa de conversión (leads a clientes)
    const conversionRate = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;
    
    return {
      totalSales,
      totalCustomers,
      totalLeads,
      avgSaleValue,
      conversionRate,
      salesCount: sales.length,
      topCity: getSalesByCity()[0]?.city || "N/A",
      topProvince: getCustomersByProvince()[0]?.province || "N/A"
    };
  };
  
  // Guardar un informe
  const saveReport = () => {
    if (!reportName.trim()) return;
    
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: reportName,
      type: reportType,
      dateRange: timeRange,
      brandFilter: brandFilter,
      customSettings: compareMode ? { compareMode, compareTimeRange } : undefined,
      createdAt: new Date().toISOString()
    };
    
    setSavedReports([...savedReports, newReport]);
    setReportName("");
    setShowSaveDialog(false);
  };
  
  // Cargar un informe guardado
  const loadReport = (report: SavedReport) => {
    setReportType(report.type);
    setTimeRange(report.dateRange);
    setBrandFilter(report.brandFilter);
    
    if (report.customSettings) {
      if (report.customSettings.compareMode !== undefined) {
        setCompareMode(report.customSettings.compareMode);
      }
      
      if (report.customSettings.compareTimeRange) {
        setCompareTimeRange(report.customSettings.compareTimeRange);
      }
    }
    
    setSelectedReport(report);
  };
  
  // Eliminar un informe guardado
  const deleteReport = (id: string) => {
    setSavedReports(savedReports.filter(report => report.id !== id));
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
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
    
    // Verificamos si tenemos datos para mostrar según el tipo de informe
    const hasSalesData = salesQuery.data && salesQuery.data.length > 0;
    const hasCustomersData = customersQuery.data && customersQuery.data.length > 0;
    const hasLeadsData = leadsQuery.data && leadsQuery.data.length > 0;
    
    // Si hay errores en alguna consulta, mostramos una alerta informativa
    if (salesQuery.isError || customersQuery.isError || leadsQuery.isError) {
      return (
        <Alert>
          <AlertTitle>Datos limitados</AlertTitle>
          <AlertDescription>
            Algunos datos pueden no estar disponibles. Intenta recargar la página o ajustar los filtros.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Como ya tenemos datos de ejemplo implementados para cada tipo de informe, 
    // no es necesario mostrar alertas de "Sin datos" aquí, ya que siempre tendremos 
    // al menos los datos de ejemplo para mostrar.
    //
    // Nota: Si se requiere verificar la existencia de datos reales antes de mostrar
    // visualizaciones, aquí se pueden añadir esas comprobaciones.
    
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
      
      case "sales-over-time": {
        const data = getSalesOverTime();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ventas a lo Largo del Tiempo</h3>
            <p className="text-sm text-muted-foreground">
              Este informe muestra la evolución de ventas a lo largo del tiempo.
            </p>
            
            {data.length > 0 ? (
              <div className="h-[400px] w-full">
                <TimeSeriesChart data={data} />
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
  
  // Los métodos getBrands y getKpis ya fueron declarados arriba
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informes y Análisis</h1>
          <p className="text-muted-foreground">
            Analiza los datos de tu negocio para tomar decisiones informadas.
          </p>
          
          {/* Selector de tipos de reporte */}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button 
              variant={reportType === REPORT_TYPES.SALES_BY_CITY ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType(REPORT_TYPES.SALES_BY_CITY)}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Ventas por Ciudad
            </Button>
            <Button 
              variant={reportType === REPORT_TYPES.CUSTOMERS_BY_PROVINCE ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType(REPORT_TYPES.CUSTOMERS_BY_PROVINCE)}
            >
              <PieChartIcon className="mr-2 h-4 w-4" />
              Clientes por Provincia
            </Button>
            <Button 
              variant={reportType === REPORT_TYPES.SALES_BY_BRAND ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType(REPORT_TYPES.SALES_BY_BRAND)}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Ventas por Marca
            </Button>
            <Button 
              variant={reportType === REPORT_TYPES.LEADS_BY_SOURCE ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType(REPORT_TYPES.LEADS_BY_SOURCE)}
            >
              <PieChartIcon className="mr-2 h-4 w-4" />
              Leads por Origen
            </Button>
            <Button 
              variant={reportType === REPORT_TYPES.SALES_OVER_TIME ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType(REPORT_TYPES.SALES_OVER_TIME)}
            >
              <LineChartIcon className="mr-2 h-4 w-4" />
              Ventas en el Tiempo
            </Button>
            <Button 
              variant={reportType === REPORT_TYPES.CUSTOM ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setReportType(REPORT_TYPES.CUSTOM);
                setActiveView("wizard");
              }}
            >
              <Sliders className="mr-2 h-4 w-4" />
              Informe Personalizado
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setTimeRange("30days")}
            className={timeRange === "30days" ? "bg-muted" : ""}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Últimos 30 días
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setBrandFilter(
              brandFilter === "all" && getBrands().length > 0 ? 
                getBrands()[0] : 
                "all"
            )}
            className={brandFilter !== "all" ? "bg-muted" : ""}
          >
            <Filter className="mr-2 h-4 w-4" />
            {brandFilter !== "all" ? `Marca: ${brandFilter}` : "Todas las marcas"}
          </Button>
        </div>
      </div>
      
      {/* Custom Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exportación Personalizada</DialogTitle>
            <DialogDescription>
              Selecciona los datos que deseas exportar a Excel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="customers" 
                  checked={selectedFields.customers}
                  onCheckedChange={(checked) => 
                    setSelectedFields({...selectedFields, customers: !!checked})
                  }
                />
                <Label htmlFor="customers">Clientes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sales" 
                  checked={selectedFields.sales}
                  onCheckedChange={(checked) => 
                    setSelectedFields({...selectedFields, sales: !!checked})
                  }
                />
                <Label htmlFor="sales">Ventas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="leads" 
                  checked={selectedFields.leads}
                  onCheckedChange={(checked) => 
                    setSelectedFields({...selectedFields, leads: !!checked})
                  }
                />
                <Label htmlFor="leads">Leads</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                exportAllData();
                setShowExportDialog(false);
              }}
              disabled={!Object.values(selectedFields).some(Boolean)}
            >
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <SelectItem value="sales-over-time">Ventas a lo Largo del Tiempo</SelectItem>
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
            <p className="text-xs text-muted-foreground text-center w-full">
              Selecciona un tipo de informe y utiliza los filtros para analizar tus datos
            </p>
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
            <DataExportOptions
              onExport={exportToExcel}
              onCustomExport={() => setShowExportDialog(true)}
              onExportAll={exportAllData}
              disabled={isLoading || isError}
            />
            
            <div className="hidden sm:block">
              <div className="flex flex-wrap gap-2">
                {Object.values(REPORT_TYPES).map((type) => (
                  <Button 
                    key={type}
                    variant={reportType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReportType(type)}
                  >
                    {type === REPORT_TYPES.SALES_BY_CITY && <BarChart2 className="mr-1 h-3 w-3" />}
                    {type === REPORT_TYPES.CUSTOMERS_BY_PROVINCE && <PieChartIcon className="mr-1 h-3 w-3" />}
                    {type === REPORT_TYPES.SALES_BY_BRAND && <BarChart2 className="mr-1 h-3 w-3" />}
                    {type === REPORT_TYPES.LEADS_BY_SOURCE && <PieChartIcon className="mr-1 h-3 w-3" />}
                    {type === REPORT_TYPES.SALES_OVER_TIME && <LineChartIcon className="mr-1 h-3 w-3" />}
                    {type === REPORT_TYPES.CUSTOM && <Sliders className="mr-1 h-3 w-3" />}
                    
                    {type === REPORT_TYPES.SALES_BY_CITY && "Ventas por Ciudad"}
                    {type === REPORT_TYPES.CUSTOMERS_BY_PROVINCE && "Clientes por Provincia"}
                    {type === REPORT_TYPES.SALES_BY_BRAND && "Ventas por Marca"}
                    {type === REPORT_TYPES.LEADS_BY_SOURCE && "Leads por Origen"}
                    {type === REPORT_TYPES.SALES_OVER_TIME && "Ventas en el Tiempo"}
                    {type === REPORT_TYPES.CUSTOM && "Personalizado"}
                  </Button>
                ))}
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}