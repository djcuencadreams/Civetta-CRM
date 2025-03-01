import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/layout/Shell";
import { Loader2, Download, Calendar, Filter, BarChart3 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format, subDays, subMonths, isAfter, parseISO, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { SourceStatsChart } from '@/components/reports/SourceStatsChart';
import { BrandRevenueChart } from '@/components/reports/BrandRevenueChart';
import { LocationStatsChart } from '@/components/reports/LocationStatsChart';
import { DashboardSummary } from '@/components/reports/DashboardSummary';
import { ReportSelector, DEFAULT_REPORT_TYPES } from '@/components/reports/ReportSelector';

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
  status: string;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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

type SavedReport = {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  brandFilter: string;
  customSettings?: Record<string, any>;
  createdAt: string;
};

export default function ReportsPage() {
  // Estado para filtros y selecciones
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    { from: subDays(new Date(), 30), to: new Date() }
  );
  const [reportType, setReportType] = useState<string>("dashboard");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Obtener datos
  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });
  
  const { data: sales, isLoading: isLoadingSales } = useQuery<Sale[]>({
    queryKey: ['/api/sales'],
  });
  
  const { data: leads, isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  // Filtrar por rango de fechas y marca
  const getFilteredData = (data: any[] | undefined, dateField: string = 'createdAt') => {
    if (!data) return [];
    
    return data.filter(item => {
      // Filtrar por fecha
      const itemDate = parseISO(item[dateField]);
      const dateInRange = (
        dateRange?.from ? isAfter(itemDate, dateRange.from) || itemDate.getTime() === dateRange.from.getTime() : true
      ) && (
        dateRange?.to ? isAfter(new Date(dateRange.to.getTime() + 86400000), itemDate) : true
      );
      
      // Filtrar por marca
      const brandMatch = brandFilter === 'all' || item.brand === brandFilter;
      
      return dateInRange && brandMatch;
    });
  };
  
  const filteredCustomers = getFilteredData(customers);
  const filteredSales = getFilteredData(sales);
  const filteredLeads = getFilteredData(leads);
  
  // Preparar datos para visualizaciones
  
  // Datos para fuentes de clientes/leads
  const sourceStatsData = React.useMemo(() => {
    const dataToUse = reportType.includes('lead') ? filteredLeads : filteredCustomers;
    if (!dataToUse.length) return [];
    
    const sourceMap: Record<string, number> = {};
    dataToUse.forEach(item => {
      const source = item.source || 'Sin especificar';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    
    return Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCustomers, filteredLeads, reportType]);
  
  // Datos para ubicaciones
  const locationStatsData = React.useMemo(() => {
    const dataToUse = reportType.includes('province') ? filteredCustomers : 
                      reportType.includes('city') ? filteredCustomers : 
                      filteredCustomers;
    
    if (!dataToUse.length) return [];
    
    const locationType = reportType.includes('province') ? 'province' : 'city';
    const locationMap: Record<string, { count: number, revenue: number }> = {};
    
    dataToUse.forEach(customer => {
      const locationValue = customer[locationType as keyof typeof customer] || 'Sin especificar';
      const locationKey = locationValue as string;
      
      if (!locationMap[locationKey]) {
        locationMap[locationKey] = { count: 0, revenue: 0 };
      }
      
      locationMap[locationKey].count += 1;
      
      // Calcular ingresos asociados a esta ubicación
      if (filteredSales && filteredSales.length) {
        const customerSales = filteredSales.filter(sale => sale.customerId === customer.id);
        locationMap[locationKey].revenue += customerSales.reduce((sum, sale) => sum + sale.amount, 0);
      }
    });
    
    return Object.entries(locationMap)
      .map(([name, { count, revenue }]) => ({ name, count, revenue }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCustomers, filteredSales, reportType]);
  
  // Datos para ingresos por marca
  const brandRevenueData = React.useMemo(() => {
    if (!filteredSales.length) return [];
    
    const brandMap: Record<string, { revenue: number, count: number }> = {};
    filteredSales.forEach(sale => {
      const brand = sale.brand || 'Sin especificar';
      if (!brandMap[brand]) {
        brandMap[brand] = { revenue: 0, count: 0 };
      }
      brandMap[brand].revenue += sale.amount;
      brandMap[brand].count += 1;
    });
    
    return Object.entries(brandMap)
      .map(([brand, { revenue, count }]) => ({ brand, revenue, count }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);
  
  // Datos para comparación con período anterior
  const previousPeriodData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !sales) return [];
    
    // Calcular duración del período actual
    const currentPeriodDays = Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    
    // Definir período anterior
    const previousPeriodEnd = subDays(dateRange.from, 1);
    const previousPeriodStart = subDays(previousPeriodEnd, currentPeriodDays);
    
    // Filtrar ventas del período anterior
    const previousSales = sales.filter(sale => {
      const saleDate = parseISO(sale.createdAt);
      return isAfter(saleDate, previousPeriodStart) && 
             isAfter(new Date(previousPeriodEnd.getTime() + 86400000), saleDate);
    });
    
    // Calcular por marca
    const brandMap: Record<string, { revenue: number, count: number }> = {};
    previousSales.forEach(sale => {
      const brand = sale.brand || 'Sin especificar';
      if (!brandMap[brand]) {
        brandMap[brand] = { revenue: 0, count: 0 };
      }
      brandMap[brand].revenue += sale.amount;
      brandMap[brand].count += 1;
    });
    
    return Object.entries(brandMap)
      .map(([brand, { revenue, count }]) => ({ brand, revenue, count }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateRange, sales]);
  
  // Datos para métricas del dashboard
  const dashboardMetrics = React.useMemo(() => {
    // Calcular métricas del período actual
    const totalCustomers = filteredCustomers.length;
    const totalLeads = filteredLeads.length;
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
    const avgOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
    
    // Calcular métricas de crecimiento
    const previousPeriodRevenue = previousPeriodData.reduce((sum, item) => sum + item.revenue, 0);
    const previousPeriodSales = previousPeriodData.reduce((sum, item) => sum + item.count, 0);
    
    // Calcular crecimientos
    const revenueGrowth = previousPeriodRevenue > 0 
      ? Math.round(((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100)
      : 0;
    const salesGrowth = previousPeriodSales > 0
      ? Math.round(((totalSales - previousPeriodSales) / previousPeriodSales) * 100)
      : 0;
    
    // Métricas adicionales
    const newCustomers = filteredCustomers.filter(customer => {
      if (!dateRange?.from) return true;
      const createdDate = parseISO(customer.createdAt);
      return isAfter(createdDate, dateRange.from);
    }).length;
    
    const activeLeads = filteredLeads.filter(lead => lead.status !== 'cerrado' && lead.status !== 'perdido').length;
    
    const conversionRate = totalLeads > 0 
      ? Math.round((newCustomers / totalLeads) * 100) 
      : 0;
    
    return {
      totalCustomers,
      totalLeads,
      totalSales,
      totalRevenue,
      avgOrderValue,
      conversionRate,
      activeLeads,
      newCustomers,
      revenueGrowth,
      salesGrowth,
      customerGrowth: 0, // Requeriría datos históricos
      leadsGrowth: 0     // Requeriría datos históricos
    };
  }, [filteredCustomers, filteredLeads, filteredSales, previousPeriodData, dateRange]);
  
  // Manejar guardado/carga de informes
  const saveCurrentReport = () => {
    // Generar ID único
    const reportId = `report-${Date.now()}`;
    
    // Crear objeto de informe
    const newReport: SavedReport = {
      id: reportId,
      name: `Informe ${reportType} - ${format(new Date(), 'dd/MM/yyyy')}`,
      type: reportType,
      dateRange: dateRange ? 
        `${dateRange.from ? format(dateRange.from, 'dd/MM/yyyy') : ''} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}` : '',
      brandFilter,
      createdAt: new Date().toISOString()
    };
    
    // Guardar al estado
    setSavedReports([...savedReports, newReport]);
    
    // También podríamos guardar en localStorage para persistencia
    const existingReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    localStorage.setItem('savedReports', JSON.stringify([...existingReports, newReport]));
  };
  
  const loadReport = (report: SavedReport) => {
    // Cargar configuración de informe
    setReportType(report.type);
    setBrandFilter(report.brandFilter);
    
    // Intentar convertir el rango de fechas
    if (report.dateRange) {
      const [fromStr, toStr] = report.dateRange.split(' - ');
      try {
        // Esto es simplificado y podría necesitar una lógica más robusta
        const from = fromStr ? new Date(fromStr.split('/').reverse().join('-')) : undefined;
        const to = toStr ? new Date(toStr.split('/').reverse().join('-')) : undefined;
        
        if (from || to) {
          setDateRange({ from, to });
        }
      } catch (error) {
        console.error('Error al parsear fechas:', error);
      }
    }
  };
  
  // Cargar informes guardados del localStorage al inicio
  useEffect(() => {
    const storedReports = localStorage.getItem('savedReports');
    if (storedReports) {
      try {
        setSavedReports(JSON.parse(storedReports));
      } catch (error) {
        console.error('Error al cargar informes guardados:', error);
      }
    }
  }, []);

  // Opciones rápidas para rango de fechas
  const setDateRangeOption = (option: string) => {
    const today = new Date();
    
    switch (option) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case 'last7days':
        setDateRange({ from: subDays(today, 6), to: today });
        break;
      case 'last30days':
        setDateRange({ from: subDays(today, 29), to: today });
        break;
      case 'thisMonth':
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRange({ from: firstDayOfMonth, to: today });
        break;
      case 'lastMonth':
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateRange({ from: firstDayOfLastMonth, to: lastDayOfLastMonth });
        break;
      case 'all':
        setDateRange(undefined);
        break;
      default:
        break;
    }
  };
  
  // Función para exportar datos
  const exportCurrentReport = () => {
    // Determinar qué datos exportar según el tipo de informe
    let dataToExport: any[] = [];
    let fileName = 'reporte';
    
    if (reportType.includes('customer')) {
      dataToExport = filteredCustomers;
      fileName = 'clientes';
    } else if (reportType.includes('sale') || reportType.includes('revenue') || reportType.includes('brand')) {
      dataToExport = filteredSales;
      fileName = 'ventas';
    } else if (reportType.includes('lead')) {
      dataToExport = filteredLeads;
      fileName = 'leads';
    } else {
      // Para dashboard o reportes combinados, exportar todos los datos
      dataToExport = [...filteredCustomers, ...filteredSales, ...filteredLeads];
      fileName = 'datos-completos';
    }
    
    // Crear URL para descargar
    if (dataToExport.length) {
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace y simular clic
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${format(new Date(), 'yyyyMMdd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  // Exportar específicamente un tipo de informe
  const exportSpecificReport = (type: string) => {
    let dataToExport: any[] = [];
    let fileName = 'reporte';
    
    if (type === 'customers-by-source') {
      dataToExport = sourceStatsData;
      fileName = 'fuentes-clientes';
    } else if (type === 'leads-by-source') {
      dataToExport = sourceStatsData;
      fileName = 'fuentes-leads';
    } else if (type.includes('location')) {
      dataToExport = locationStatsData;
      fileName = `ubicacion-${type.includes('province') ? 'provincias' : 'ciudades'}`;
    } else if (type.includes('brand') || type.includes('revenue')) {
      dataToExport = brandRevenueData;
      fileName = 'ingresos-marcas';
    }
    
    // Crear URL para descargar
    if (dataToExport.length) {
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace y simular clic
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${format(new Date(), 'yyyyMMdd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const isLoading = isLoadingCustomers || isLoadingSales || isLoadingLeads;
  
  return (
    <Shell>
      <div className="container mx-auto p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Informes y Análisis de Datos</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button
                variant="outline"
                onClick={saveCurrentReport}
              >
                Guardar informe
              </Button>
            </div>
          </div>
          
          {/* Filtros colapsables */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Rango de Fechas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setDateRangeOption('today')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Hoy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setDateRangeOption('yesterday')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Ayer
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setDateRangeOption('last7days')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Últimos 7 días
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setDateRangeOption('last30days')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Últimos 30 días
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground mb-2">Personalizado:</p>
                      <DateRangePicker 
                        value={dateRange} 
                        onChange={(range: DateRange | undefined) => setDateRange(range)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Filtros Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Marca:
                      </label>
                      <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las marcas</SelectItem>
                          <SelectItem value="Civetta Sleepwear">Civetta Sleepwear</SelectItem>
                          <SelectItem value="Civetta Bride">Civetta Bride</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Informes Guardados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                    {savedReports.length > 0 ? (
                      savedReports.map(report => (
                        <div 
                          key={report.id}
                          className="p-2 text-sm cursor-pointer hover:bg-muted flex justify-between items-center"
                          onClick={() => loadReport(report)}
                        >
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-xs text-muted-foreground">{report.dateRange}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Cargar
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-sm text-muted-foreground text-center">
                        No hay informes guardados
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Selector de tipo de informe */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <ReportSelector 
                selectedReportType={reportType}
                onSelectReportType={setReportType}
                reportTypes={DEFAULT_REPORT_TYPES}
              />
            </div>
            
            {/* Área de visualización de informes */}
            <div className="md:col-span-3 space-y-4">
              {/* Encabezado del informe */}
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xl font-semibold">
                    {reportType === 'dashboard' && 'Tablero Principal'}
                    {reportType === 'customers-by-source' && 'Clientes por Fuente'}
                    {reportType === 'leads-by-source' && 'Leads por Fuente'}
                    {reportType === 'customers-by-province' && 'Clientes por Provincia'}
                    {reportType === 'customers-by-city' && 'Clientes por Ciudad'}
                    {reportType === 'revenue-by-brand' && 'Ingresos por Marca'}
                    {reportType === 'brand-performance' && 'Rendimiento por Marca'}
                    {reportType === 'sales-over-time' && 'Evolución de Ventas'}
                    {reportType === 'conversion-analysis' && 'Análisis de Conversión'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {dateRange?.from && dateRange?.to ? (
                      `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
                    ) : (
                      'Todos los datos'
                    )}
                    {brandFilter !== 'all' && ` • ${brandFilter}`}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => exportCurrentReport()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {reportType === 'dashboard' && (
                    <div className="space-y-8">
                      <DashboardSummary metrics={dashboardMetrics} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BrandRevenueChart 
                          data={brandRevenueData}
                          title="Ingresos por Marca" 
                          showComparison={true}
                          comparisonData={previousPeriodData}
                          comparisonLabel="Período anterior"
                          onExport={() => exportSpecificReport('revenue-by-brand')}
                        />
                        
                        <SourceStatsChart 
                          data={sourceStatsData}
                          title="Clientes por Fuente" 
                          dataType="customers"
                          onExport={() => exportSpecificReport('customers-by-source')}
                        />
                      </div>
                      
                      <LocationStatsChart 
                        data={locationStatsData}
                        title="Provincias por Cantidad de Clientes" 
                        type="province"
                        valueType="count"
                        onExport={() => exportSpecificReport('customers-by-province')}
                      />
                    </div>
                  )}

                  {reportType === 'customers-by-source' && (
                    <SourceStatsChart 
                      data={sourceStatsData}
                      title="Análisis de Fuentes de Clientes" 
                      description="Distribución de clientes según su origen de adquisición"
                      dataType="customers"
                      onExport={() => exportSpecificReport('customers-by-source')}
                    />
                  )}
                  
                  {reportType === 'leads-by-source' && (
                    <SourceStatsChart 
                      data={sourceStatsData}
                      title="Análisis de Fuentes de Leads" 
                      description="Distribución de leads según su origen de captura"
                      dataType="leads"
                      onExport={() => exportSpecificReport('leads-by-source')}
                    />
                  )}
                  
                  {reportType === 'customers-by-province' && (
                    <LocationStatsChart 
                      data={locationStatsData}
                      title="Análisis de Clientes por Provincia" 
                      description="Distribución geográfica por provincia para segmentación y campañas"
                      type="province"
                      valueType="count"
                      onExport={() => exportSpecificReport('customers-by-province')}
                    />
                  )}
                  
                  {reportType === 'customers-by-city' && (
                    <LocationStatsChart 
                      data={locationStatsData}
                      title="Análisis de Clientes por Ciudad" 
                      description="Distribución geográfica por ciudad para segmentación y campañas locales"
                      type="city"
                      valueType="count"
                      onExport={() => exportSpecificReport('customers-by-city')}
                    />
                  )}
                  
                  {reportType === 'revenue-by-brand' && (
                    <BrandRevenueChart 
                      data={brandRevenueData}
                      title="Análisis de Ingresos por Marca" 
                      description="Comparación de ingresos generados por cada marca"
                      onExport={() => exportSpecificReport('revenue-by-brand')}
                    />
                  )}
                  
                  {reportType === 'brand-performance' && (
                    <BrandRevenueChart 
                      data={brandRevenueData}
                      title="Rendimiento Comparativo por Marca" 
                      description="Análisis comparativo entre las diferentes marcas"
                      showComparison={true}
                      comparisonData={previousPeriodData}
                      comparisonLabel="Período anterior"
                      onExport={() => exportSpecificReport('brand-performance')}
                    />
                  )}
                  
                  {reportType === 'sales-over-time' && (
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle>Evolución Temporal de Ventas</CardTitle>
                        <CardDescription>
                          Análisis en desarrollo - Próximamente disponible
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px] flex justify-center items-center">
                        <div className="text-center">
                          <BarChart3 className="h-16 w-16 mx-auto text-primary/20 mb-4" />
                          <p className="text-muted-foreground">
                            Este informe estará disponible próximamente
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {reportType === 'conversion-analysis' && (
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle>Análisis de Conversión de Leads</CardTitle>
                        <CardDescription>
                          Análisis en desarrollo - Próximamente disponible
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px] flex justify-center items-center">
                        <div className="text-center">
                          <BarChart3 className="h-16 w-16 mx-auto text-primary/20 mb-4" />
                          <p className="text-muted-foreground">
                            Este informe estará disponible próximamente
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              
              <div className="text-xs text-muted-foreground mt-2 text-right">
                <p>
                  Total: {filteredCustomers.length} clientes, {filteredLeads.length} leads, {filteredSales.length} ventas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}