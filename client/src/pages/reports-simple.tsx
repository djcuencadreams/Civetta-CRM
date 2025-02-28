import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DownloadCloud, Database, CalendarDays, RefreshCw } from "lucide-react";
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
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // Funciones para exportar datos
  const exportToExcel = (reportType: string) => {
    setIsLoading(true);
    
    // Construir los parámetros de filtro
    const dateStartParam = format(startDate, 'yyyy-MM-dd');
    const dateEndParam = format(endDate, 'yyyy-MM-dd');
    const params = `dateStart=${dateStartParam}&dateEnd=${dateEndParam}`;
    
    // Seleccionar la URL basada en el tipo de reporte
    let url = '';
    if (reportType === 'customers') {
      url = `/api/export/customers?${params}`;
    } else if (reportType === 'leads') {
      url = `/api/export/leads?${params}`;
    } else if (reportType === 'sales') {
      url = `/api/export/sales?${params}`;
    } else {
      url = `/api/export/all?${params}`;
    }
    
    // Descargar el archivo
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la exportación');
        }
        return response.blob();
      })
      .then(blob => {
        // Crear un link temporal para la descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Establecer el nombre del archivo
        switch (reportType) {
          case 'customers':
            a.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            break;
          case 'leads':
            a.download = `leads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            break;
          case 'sales':
            a.download = `ventas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            break;
          default:
            a.download = `reporte_completo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        }
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .then(() => {
        toast({
          title: "Exportación exitosa",
          description: "Los datos se han exportado correctamente",
          variant: "default"
        });
      })
      .catch(error => {
        console.error('Error al exportar:', error);
        toast({
          title: "Error de exportación",
          description: "No se pudieron exportar los datos. Por favor intente nuevamente.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
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
                onClick={() => exportToExcel('customers')}
                disabled={isLoading || isLoadingCustomers || isErrorCustomers || !filteredCustomers.length}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
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
                  Mostrando 10 de {filteredCustomers.length} clientes. Exporte a Excel para ver todos los registros.
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
                onClick={() => exportToExcel('leads')}
                disabled={isLoading || isLoadingLeads || isErrorLeads || !filteredLeads.length}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
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
                  Mostrando 10 de {filteredLeads.length} leads. Exporte a Excel para ver todos los registros.
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
                onClick={() => exportToExcel('sales')}
                disabled={isLoading || isLoadingSales || isErrorSales || !filteredSales.length}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {sale.customer?.name || `Cliente #${sale.customerId}`}
                              </div>
                              <div className="text-sm text-gray-500">ID: {sale.customerId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(sale.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}
                              >
                                {sale.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sale.paymentMethod || "-"}
                            </td>
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
                  Mostrando 10 de {filteredSales.length} ventas. Exporte a Excel para ver todos los registros.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {filteredSales.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>Total:</strong> {formatCurrency(
                    filteredSales.reduce((acc, sale) => acc + Number(sale.amount), 0)
                  )}
                </div>
              )}
              <Button 
                variant="default" 
                onClick={() => exportToExcel('all')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Exportando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Exportar Reporte Completo
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}