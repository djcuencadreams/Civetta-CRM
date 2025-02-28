import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DownloadCloud, Database, CalendarDays, RefreshCw, Users, UserPlus, DollarSign, BarChart4 } from "lucide-react";
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

export default function SimpleReportsPage() {
  // Estados para el filtro de fechas
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
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
      fileName = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (reportType === 'leads') {
      endpoint = '/api/export/leads';
      fileName = `leads_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else if (reportType === 'sales') {
      endpoint = '/api/export/sales';
      fileName = `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      endpoint = '/api/export/all';
      fileName = `reporte_completo_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
  
  // Filtrar los datos por fecha
  const filteredCustomers = filterByDate(customers);
  const filteredLeads = filterByDate(leads);
  const filteredSales = filterByDate(sales);
  
  // Función para actualizar los datos
  const refreshData = () => {
    refetchCustomers();
    refetchLeads();
    refetchSales();
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
        <p className="text-muted-foreground">
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
      
      {/* Resumen de datos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Clientes</CardTitle>
            <CardDescription>Total en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold">{filteredCustomers.length}</div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ventas</CardTitle>
            <CardDescription>Total en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold">{filteredSales.length}</div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-8 w-8 text-green-700" />
              </div>
            </div>
            {filteredSales.length > 0 && (
              <div className="text-sm mt-2">
                Valor total: {formatCurrency(
                  filteredSales.reduce((sum, sale) => sum + sale.amount, 0)
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription>Total en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold">{filteredLeads.length}</div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <UserPlus className="h-8 w-8 text-yellow-700" />
              </div>
            </div>
          </CardContent>
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
                    Exportar a CSV
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
                <div className="rounded-md border">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.slice(0, 10).map((customer) => (
                          <tr key={customer.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.firstName} {customer.lastName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {customer.phone || customer.phoneNumber ? 
                                `${customer.phoneCountry || ''} ${customer.phoneNumber || customer.phone}` : 
                                "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{customer.city || "-"}</div>
                              <div className="text-sm text-gray-500">{customer.province || "-"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.brand || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(customer.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredCustomers.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Mostrando 10 de {filteredCustomers.length} clientes. Exporte a CSV para ver todos los registros.
                </div>
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
                    Exportar a CSV
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
                <div className="rounded-md border">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLeads.slice(0, 10).map((lead) => (
                          <tr key={lead.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                              <div className="text-sm text-gray-500">{lead.firstName} {lead.lastName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.email || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' : 
                                lead.status === 'qualified' ? 'bg-green-100 text-green-800' : 
                                lead.status === 'won' ? 'bg-green-100 text-green-800' : 
                                lead.status === 'lost' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.source || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.brand || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(lead.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredLeads.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Mostrando 10 de {filteredLeads.length} leads. Exporte a CSV para ver todos los registros.
                </div>
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
                    Exportar a CSV
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
                <div className="rounded-md border">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método de Pago</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSales.slice(0, 10).map((sale) => (
                          <tr key={sale.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.customer?.name || `Cliente #${sale.customerId}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {formatCurrency(sale.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${sale.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}
                              >
                                {sale.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.paymentMethod || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.brand || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredSales.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Mostrando 10 de {filteredSales.length} ventas. Exporte a CSV para ver todos los registros.
                </div>
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
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <BarChart4 className="mr-2 h-4 w-4" />
              Exportar Todos los Datos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}