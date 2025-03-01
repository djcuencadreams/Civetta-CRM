import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  DownloadCloud, Database, CalendarDays, RefreshCw, Users, UserPlus, DollarSign, BarChart4,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Tipo de datos para clientes
type Customer = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneCountry: string | null;
  phoneNumber: string | null;
  street: string | null;
  city: string | null;
  province: string | null;
  deliveryInstructions: string | null;
  address: string | null;
  source: string | null;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// Tipo de datos para leads
type Lead = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneCountry: string | null;
  phoneNumber: string | null;
  street: string | null;
  city: string | null;
  province: string | null;
  deliveryInstructions: string | null;
  status: string;
  source: string | null;
  brand: string | null;
  notes: string | null;
  convertedToCustomer: boolean;
  convertedCustomerId: number | null;
  lastContact: string | null;
  nextFollowUp: string | null;
  customerLifecycleStage: string | null;
  createdAt: string;
  updatedAt: string;
};

// Tipo de datos para ventas
type Sale = {
  id: number;
  customerId: number;
  amount: number;
  status: string;
  paymentMethod: string | null;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
  };
};

// Formatear dinero
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Formatear fecha
const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'dd/MM/yyyy');
};

// Definir tipos para la ordenación
type SortDirection = 'asc' | 'desc' | null;

type SortConfig = {
  key: string;
  direction: SortDirection;
};

export default function SimpleReportsPage() {
  // Estados para el filtro de fechas
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Estados para la paginación
  const [customersPage, setCustomersPage] = useState(1);
  const [leadsPage, setLeadsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para la ordenación
  const [customerSort, setCustomerSort] = useState<SortConfig>({ key: 'firstName', direction: 'asc' });
  const [leadSort, setLeadSort] = useState<SortConfig>({ key: 'firstName', direction: 'asc' });
  const [saleSort, setSaleSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Consultas para obtener los datos
  const { data: customers, isLoading: isLoadingCustomers, isError: isErrorCustomers, refetch: refetchCustomers } = 
    useQuery<Customer[]>({
      queryKey: ['/api/customers'],
      queryFn: getQueryFn({ on401: "throw" }),
    });
    
  const { data: leads, isLoading: isLoadingLeads, isError: isErrorLeads, refetch: refetchLeads } = 
    useQuery<Lead[]>({
      queryKey: ['/api/leads'],
      queryFn: getQueryFn({ on401: "throw" }),
    });
    
  const { data: sales, isLoading: isLoadingSales, isError: isErrorSales, refetch: refetchSales } = 
    useQuery<Sale[]>({
      queryKey: ['/api/sales'],
      queryFn: getQueryFn({ on401: "throw" }),
    });

  // Función para filtrar por fecha
  const filterByDate = <T extends { createdAt: string }>(data: T[] | undefined) => {
    if (!data) return [];
    
    // Establecer la hora de inicio a las 00:00:00
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    // Establecer la hora de fin a las 23:59:59
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDateTime && itemDate <= endDateTime;
    });
  };

  // Función para exportar datos a CSV
  const exportToCSV = (reportType: string) => {
    setIsLoading(true);
    
    // Construir los parámetros de filtro
    const dateStartParam = format(startDate, 'yyyy-MM-dd');
    const dateEndParam = format(endDate, 'yyyy-MM-dd');
    const params = new URLSearchParams();
    params.append('dateStart', dateStartParam);
    params.append('dateEnd', dateEndParam);
    
    // Seleccionar la URL basada en el tipo de reporte
    let endpoint = '';
    let fileName = '';
    
    if (reportType === 'customers') {
      endpoint = '/api/export/customers';
      fileName = `clientes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else if (reportType === 'leads') {
      endpoint = '/api/export/leads';
      fileName = `leads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else if (reportType === 'sales') {
      endpoint = '/api/export/sales';
      fileName = `ventas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    } else {
      endpoint = '/api/export/all';
      fileName = `reporte_completo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    }
    
    const url = `${endpoint}?${params.toString()}`;
    
    // Utilizar Fetch API en lugar de XMLHttpRequest para mejor manejo de datos binarios
    try {
      console.log('Iniciando descarga desde:', url);
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
          }
          
          // Mostrar más detalle de las cabeceras para debug
          console.log('Respuesta recibida: Headers completos', {
            contentLength: response.headers.get('Content-Length'),
            contentType: response.headers.get('Content-Type'),
            contentDisposition: response.headers.get('Content-Disposition')
          });
          
          // Obtener y manejar el blob
          return response.blob().then(blob => {
            console.log('Blob recibido:', blob.size, 'bytes', 'tipo:', blob.type);
            return blob;
          });
        })
        .then(blob => {
          // Verificar que el blob no esté vacío
          if (blob.size === 0) {
            console.error('El archivo exportado está vacío');
            toast({
              title: "Error de exportación",
              description: "El archivo generado está vacío. Intente nuevamente o contacte al soporte.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }
          
          console.log('Tamaño del blob recibido:', blob.size, 'bytes');
          console.log('Tipo MIME del blob:', blob.type);
          
          // Respetar el tipo MIME original para permitir tanto CSV como Excel
          // Crear un objeto URL para el blob (sin cambiar el tipo)
          const downloadUrl = window.URL.createObjectURL(blob);
          
          // Crear un enlace para la descarga
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = downloadUrl;
          a.download = fileName;
          
          // Agregar el enlace al documento, hacer clic y luego eliminarlo
          document.body.appendChild(a);
          a.click();
          
          // Limpiar recursos después de un pequeño retraso
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            
            // Notificar al usuario después de la descarga exitosa
            toast({
              title: "Exportación exitosa",
              description: `Los datos de ${
                reportType === 'customers' ? 'clientes' : 
                reportType === 'leads' ? 'leads' : 
                reportType === 'sales' ? 'ventas' : 'todos los módulos'
              } se han exportado correctamente`,
              variant: "default"
            });
            
            setIsLoading(false);
          }, 300);
        })
        .catch(error => {
          console.error('Error en la exportación:', error);
          toast({
            title: "Error de exportación",
            description: "Ocurrió un error al exportar. Por favor intente nuevamente o contacte al soporte.",
            variant: "destructive"
          });
          setIsLoading(false);
        });
    } catch (error) {
      console.error('Error al iniciar la descarga:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudo iniciar la exportación. Por favor intente nuevamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  // Función genérica para ordenar datos
  const sortData = <T extends Record<string, any>>(data: T[], sortConfig: SortConfig): T[] => {
    if (!sortConfig.direction) return [...data];
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;
      
      // Para ordenar por nombre completo (combinando firstName y lastName)
      if (sortConfig.key === 'firstName' && 'lastName' in a) {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        
        return sortConfig.direction === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      }
      
      // Para ordenar por cantidad
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      }
      
      // Para ordenar por fechas
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt') {
        return sortConfig.direction === 'asc' 
          ? new Date(a[sortConfig.key]).getTime() - new Date(b[sortConfig.key]).getTime() 
          : new Date(b[sortConfig.key]).getTime() - new Date(a[sortConfig.key]).getTime();
      }
      
      // Ordenamiento general para campos de texto
      if (typeof a[sortConfig.key] === 'string' && typeof b[sortConfig.key] === 'string') {
        return sortConfig.direction === 'asc' 
          ? a[sortConfig.key].localeCompare(b[sortConfig.key]) 
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      
      // Ordenamiento numérico general
      return sortConfig.direction === 'asc' 
        ? (a[sortConfig.key] || 0) - (b[sortConfig.key] || 0) 
        : (b[sortConfig.key] || 0) - (a[sortConfig.key] || 0);
    });
  };
  
  // Función para cambiar el ordenamiento
  const requestSort = (key: string, currentConfig: SortConfig, setConfig: React.Dispatch<React.SetStateAction<SortConfig>>) => {
    let direction: SortDirection = 'asc';
    
    if (currentConfig.key === key) {
      if (currentConfig.direction === 'asc') {
        direction = 'desc';
      } else if (currentConfig.direction === 'desc') {
        direction = 'asc';
      }
    }
    
    setConfig({ key, direction });
  };
  
  // Filtrar los datos por fecha
  const filteredCustomers = sortData(filterByDate(customers), customerSort);
  const filteredLeads = sortData(filterByDate(leads), leadSort);
  const filteredSales = sortData(filterByDate(sales), saleSort);
  
  // Función para actualizar los datos
  const refreshData = () => {
    refetchCustomers();
    refetchLeads();
    refetchSales();
  };
  
  // Funciones para la paginación
  const getPaginatedItems = <T,>(items: T[], page: number, itemsPerPage: number): T[] => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };
  
  // Calcular el número total de páginas
  const getTotalPages = (totalItems: number): number => {
    return Math.ceil(totalItems / itemsPerPage);
  };
  


  // Componente de paginación reutilizable
  const PaginationControls = ({ 
    currentPage, 
    totalItems, 
    onPageChange 
  }: { 
    currentPage: number, 
    totalItems: number, 
    onPageChange: (page: number) => void 
  }) => {
    const totalPages = getTotalPages(totalItems);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="hidden sm:flex"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm px-4">
          Página {currentPage} de {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="hidden sm:flex"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col items-center text-center mb-2 sm:mb-4 sm:text-left sm:items-start">
        <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Consulta y exporta la información de clientes, leads y ventas
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Establece los filtros para tus informes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="start-date">Fecha Inicial</Label>
              <DatePicker
                value={startDate}
                onChange={(date) => {
                  if (date) {
                    setStartDate(date);
                    // Refrescar datos automáticamente al cambiar la fecha
                    setTimeout(() => refreshData(), 100);
                  }
                }}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="end-date">Fecha Final</Label>
              <DatePicker
                value={endDate}
                onChange={(date) => {
                  if (date) {
                    setEndDate(date);
                    // Refrescar datos automáticamente al cambiar la fecha
                    setTimeout(() => refreshData(), 100);
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="mb-0.5"
                onClick={refreshData}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Resumen de datos - Optimizado para móvil con diseño compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <Card className="bg-gradient-to-br from-violet-100 to-violet-200 border-violet-300 shadow-sm">
          <div className="px-3 py-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-violet-800">Clientes</h3>
              <p className="text-xs text-violet-600 -mt-0.5">Total en el período</p>
              <span className="text-2xl font-bold text-violet-900 block mt-0.5">{filteredCustomers.length}</span>
            </div>
            <div className="p-1.5 bg-violet-200 rounded-full shadow-sm">
              <Users className="h-5 w-5 text-violet-700" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-300 shadow-sm">
          <div className="px-3 py-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-emerald-800">Ventas</h3>
              <p className="text-xs text-emerald-600 -mt-0.5">Total en el período</p>
              <span className="text-2xl font-bold text-emerald-900 block mt-0.5">{filteredSales.length}</span>
              {filteredSales.length > 0 && (
                <span className="text-xs font-medium text-emerald-800 block -mt-1">
                  {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.amount, 0))}
                </span>
              )}
            </div>
            <div className="p-1.5 bg-emerald-200 rounded-full shadow-sm">
              <DollarSign className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-pink-100 to-pink-200 border-pink-300 shadow-sm">
          <div className="px-3 py-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-pink-800">Leads</h3>
              <p className="text-xs text-pink-600 -mt-0.5">Total en el período</p>
              <span className="text-2xl font-bold text-pink-900 block mt-0.5">{filteredLeads.length}</span>
            </div>
            <div className="p-1.5 bg-pink-200 rounded-full shadow-sm">
              <UserPlus className="h-5 w-5 text-pink-700" />
            </div>
          </div>
        </Card>
      </div>
      
      <Tabs defaultValue="customers">
        <TabsList className="mb-4">
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Clientes */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  {filteredCustomers.length} clientes encontrados entre el {format(startDate, 'dd/MM/yyyy')} y el {format(endDate, 'dd/MM/yyyy')}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV('customers')}
                disabled={isLoading || isLoadingCustomers || isErrorCustomers || !filteredCustomers.length}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Exportar a Excel
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>


              {isLoadingCustomers ? (
                <div className="text-center py-4">Cargando datos...</div>
              ) : isErrorCustomers ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    No se pudieron cargar los datos de clientes. Intente nuevamente.
                  </AlertDescription>
                </Alert>
              ) : filteredCustomers.length === 0 ? (
                <Alert>
                  <AlertTitle>Sin datos</AlertTitle>
                  <AlertDescription>
                    No se encontraron clientes en el rango de fechas seleccionado.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border border-violet-200 shadow-sm">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-violet-200 table-fixed">
                      <thead className="bg-violet-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider w-8">#</th>
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('firstName', customerSort, setCustomerSort)}
                          >
                            <div className="flex items-center">
                              Nombre
                              {customerSort.key === 'firstName' && (
                                customerSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-violet-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-violet-600" />
                              )}
                              {customerSort.key !== 'firstName' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-violet-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('email', customerSort, setCustomerSort)}
                          >
                            <div className="flex items-center">
                              Email
                              {customerSort.key === 'email' && (
                                customerSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-violet-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-violet-600" />
                              )}
                              {customerSort.key !== 'email' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-violet-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider">Teléfono</th>
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('city', customerSort, setCustomerSort)}
                          >
                            <div className="flex items-center">
                              Ubicación
                              {customerSort.key === 'city' && (
                                customerSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-violet-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-violet-600" />
                              )}
                              {customerSort.key !== 'city' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-violet-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('brand', customerSort, setCustomerSort)}
                          >
                            <div className="flex items-center">
                              Marca
                              {customerSort.key === 'brand' && (
                                customerSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-violet-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-violet-600" />
                              )}
                              {customerSort.key !== 'brand' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-violet-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-violet-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('createdAt', customerSort, setCustomerSort)}
                          >
                            <div className="flex items-center">
                              Fecha
                              {customerSort.key === 'createdAt' && (
                                customerSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-violet-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-violet-600" />
                              )}
                              {customerSort.key !== 'createdAt' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-violet-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-violet-100">
                        {getPaginatedItems(filteredCustomers, customersPage, itemsPerPage).map((customer, index) => (
                          <tr key={customer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-violet-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-violet-900">{(customersPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-violet-900">{customer.firstName} {customer.lastName}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-violet-800">{customer.email || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-violet-800">
                              {customer.phone || customer.phoneNumber ? 
                                `${customer.phoneCountry || ''} ${customer.phoneNumber || customer.phone}` : 
                                "-"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-violet-900">{customer.city || "-"}</div>
                              <div className="text-sm text-violet-600">{customer.province || "-"}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {customer.brand && (
                                <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-violet-100 text-violet-800">
                                  {customer.brand}
                                </span>
                              )}
                              {!customer.brand && <span className="text-sm text-violet-800">-</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-violet-800">{formatDate(customer.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredCustomers.length > 0 && (
                <PaginationControls
                  currentPage={customersPage}
                  totalItems={filteredCustomers.length}
                  onPageChange={setCustomersPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Leads */}
        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Lista de Leads</CardTitle>
                <CardDescription>
                  {filteredLeads.length} leads encontrados entre el {format(startDate, 'dd/MM/yyyy')} y el {format(endDate, 'dd/MM/yyyy')}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV('leads')}
                disabled={isLoading || isLoadingLeads || isErrorLeads || !filteredLeads.length}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Exportar a Excel
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>


              {isLoadingLeads ? (
                <div className="text-center py-4">Cargando datos...</div>
              ) : isErrorLeads ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    No se pudieron cargar los datos de leads. Intente nuevamente.
                  </AlertDescription>
                </Alert>
              ) : filteredLeads.length === 0 ? (
                <Alert>
                  <AlertTitle>Sin datos</AlertTitle>
                  <AlertDescription>
                    No se encontraron leads en el rango de fechas seleccionado.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border border-pink-200 shadow-sm">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-pink-200 table-fixed">
                      <thead className="bg-pink-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-pink-700 uppercase tracking-wider w-8">#</th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('firstName', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Nombre
                              {leadSort.key === 'firstName' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'firstName' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('email', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Email
                              {leadSort.key === 'email' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'email' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('status', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Estado
                              {leadSort.key === 'status' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'status' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('source', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Origen
                              {leadSort.key === 'source' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'source' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('brand', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Marca
                              {leadSort.key === 'brand' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'brand' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('createdAt', leadSort, setLeadSort)}
                          >
                            <div className="flex items-center">
                              Fecha
                              {leadSort.key === 'createdAt' && (
                                leadSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-pink-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-pink-600" />
                              )}
                              {leadSort.key !== 'createdAt' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-pink-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-pink-100">
                        {getPaginatedItems(filteredLeads, leadsPage, itemsPerPage).map((lead, index) => (
                          <tr key={lead.id} className={index % 2 === 0 ? 'bg-white' : 'bg-pink-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-pink-900">{(leadsPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-pink-900">{lead.firstName} {lead.lastName}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-pink-800">{lead.email || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${lead.status === 'new' ? 'bg-violet-100 text-violet-800' : 
                                lead.status === 'contacted' ? 'bg-pink-100 text-pink-800' : 
                                lead.status === 'qualified' ? 'bg-emerald-100 text-emerald-800' : 
                                lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' : 
                                lead.status === 'lost' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-pink-800">{lead.source || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {lead.brand && (
                                <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800">
                                  {lead.brand}
                                </span>
                              )}
                              {!lead.brand && <span className="text-sm text-pink-800">-</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-pink-800">{formatDate(lead.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredLeads.length > 0 && (
                <PaginationControls
                  currentPage={leadsPage}
                  totalItems={filteredLeads.length}
                  onPageChange={setLeadsPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Ventas */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Lista de Ventas</CardTitle>
                <CardDescription>
                  {filteredSales.length} ventas encontradas entre el {format(startDate, 'dd/MM/yyyy')} y el {format(endDate, 'dd/MM/yyyy')}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV('sales')}
                disabled={isLoading || isLoadingSales || isErrorSales || !filteredSales.length}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Exportar a Excel
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>


              {isLoadingSales ? (
                <div className="text-center py-4">Cargando datos...</div>
              ) : isErrorSales ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    No se pudieron cargar los datos de ventas. Intente nuevamente.
                  </AlertDescription>
                </Alert>
              ) : filteredSales.length === 0 ? (
                <Alert>
                  <AlertTitle>Sin datos</AlertTitle>
                  <AlertDescription>
                    No se encontraron ventas en el rango de fechas seleccionado.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border border-emerald-200 shadow-sm">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-emerald-200">
                      <thead className="bg-emerald-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">#</th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('customerId', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Cliente
                              {saleSort.key === 'customerId' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'customerId' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('amount', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Monto
                              {saleSort.key === 'amount' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'amount' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('status', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Estado
                              {saleSort.key === 'status' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'status' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('paymentMethod', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Método de Pago
                              {saleSort.key === 'paymentMethod' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'paymentMethod' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('brand', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Marca
                              {saleSort.key === 'brand' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'brand' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('createdAt', saleSort, setSaleSort)}
                          >
                            <div className="flex items-center">
                              Fecha
                              {saleSort.key === 'createdAt' && (
                                saleSort.direction === 'asc' ? 
                                <ArrowUp className="ml-1 h-4 w-4 text-emerald-600" /> : 
                                <ArrowDown className="ml-1 h-4 w-4 text-emerald-600" />
                              )}
                              {saleSort.key !== 'createdAt' && (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-emerald-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-emerald-100">
                        {getPaginatedItems(filteredSales, salesPage, itemsPerPage).map((sale, index) => (
                          <tr key={sale.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-900">{(salesPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-900 font-medium">
                              {sale.customer?.name || `Cliente #${sale.customerId}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-900 font-bold">
                              {formatCurrency(sale.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${sale.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 
                                sale.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                                sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}
                              >
                                {sale.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-800">{sale.paymentMethod || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {sale.brand && (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                  {sale.brand}
                                </span>
                              )}
                              {!sale.brand && <span className="text-sm text-emerald-800">-</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-800">{formatDate(sale.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredSales.length > 0 && (
                <PaginationControls
                  currentPage={salesPage}
                  totalItems={filteredSales.length}
                  onPageChange={setSalesPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Botón para exportar todos los datos */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={() => exportToCSV('all')}
          disabled={isLoading || 
            (isLoadingCustomers || isLoadingSales || isLoadingLeads) || 
            (isErrorCustomers && isErrorSales && isErrorLeads) ||
            (!filteredCustomers.length && !filteredLeads.length && !filteredSales.length)}
          className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white shadow-md"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <BarChart4 className="mr-2 h-5 w-5" />
              Exportar Todos los Datos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}