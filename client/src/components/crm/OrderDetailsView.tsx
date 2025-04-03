import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, 
  Truck, 
  CreditCard, 
  User, 
  Calendar, 
  ShoppingCart, 
  Tag, 
  FileText, 
  MapPin,
  DollarSign,
  FileDown,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShippingInfoCard } from './ShippingInfoCard';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OrderDetailsProps = {
  order?: {
    id: number;
    customerId: number;
    leadId: number | null;
    orderNumber: string | null;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    source: string | null;
    brand: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    wooCommerceId: number | null; // Cambiado de woocommerceId a wooCommerceId
    assignedUserId?: number | null;
    shippingMethod?: string | null;
    trackingNumber?: string | null;
    shippingCost?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    paymentDate?: string | null;
    isFromWebForm?: boolean;
    shippingAddress?: Record<string, any>;
    customer?: {
      name: string;
      id: number;
      street?: string;
      city?: string;
      province?: string;
      phone?: string;
      idNumber?: string;
      companyName?: string;
    };
    assignedUser?: {
      id: number;
      fullName: string;
    };
    items?: {
      id: number;
      orderId: number;
      productId: number | null;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
      attributes?: Record<string, any>;
      createdAt: string;
    }[];
  };
};

export function OrderDetailsView({ order }: OrderDetailsProps) {
  const { toast } = useToast();
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);

  if (!order) {
    return <div>No se encontró información del pedido</div>;
  }

  // Función para generar y descargar etiqueta de envío
  const handleGenerateShippingLabel = async () => {
    try {
      setIsGeneratingLabel(true);
      console.log('📦 Iniciando generación de etiqueta para pedido:', order.id);
      
      // Verificar que tengamos un ID válido
      if (!order.id) {
        console.error('📦 Error: ID de pedido no válido');
        throw new Error('No se puede generar la etiqueta: ID de pedido no válido');
      }
      
      // Verificar que tengamos datos del cliente
      if (!order.customer) {
        console.error('📦 Error: No hay datos del cliente para este pedido');
        console.log('📦 Datos completos de la orden:', order);
        throw new Error('No se puede generar la etiqueta: Falta información del cliente');
      }
      
      // Verificar que tengamos direcciones necesarias en shippingAddress o en el cliente
      const hasShippingAddress = order.shippingAddress && 
        (order.shippingAddress.street || 
         order.shippingAddress.address || 
         order.shippingAddress.direccion);
         
      const hasCustomerAddress = order.customer && 
        order.customer.street;
      
      if (!hasShippingAddress && !hasCustomerAddress) {
        console.error('📦 Error: No hay dirección de envío');
        throw new Error('No se puede generar la etiqueta: Falta dirección de envío');
      }
      
      // Mostrar datos del pedido para depuración
      console.log('📦 Datos de orden disponibles:', {
        id: order.id,
        customerId: order.customerId,
        orderNumber: order.orderNumber,
        shippingAddress: order.shippingAddress,
        customer: order.customer
      });
      
      // Construir URL del endpoint (NUEVO SISTEMA)
      const endpoint = `/api/shipping/label/${order.id}`;
      console.log('📦 Llamando al NUEVO endpoint de etiquetas:', endpoint);
      
      // Llamar al endpoint para generar la etiqueta
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('📦 Respuesta recibida, status:', response.status);
      // Registrar headers de forma segura para cualquier versión de TypeScript
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      console.log('📦 Headers:', headersObj);
      
      if (!response.ok) {
        // Intentar leer la respuesta de error para más detalles
        let errorDetail = '';
        try {
          const errorData = await response.text();
          console.error('📦 Respuesta de error detallada:', errorData);
          errorDetail = errorData;
        } catch (e) {
          console.error('📦 No se pudo leer el detalle del error:', e);
        }
        
        throw new Error(`Error al generar la etiqueta de envío (${response.status}): ${errorDetail}`);
      }
      
      // Verificar tipo de contenido
      const contentType = response.headers.get('Content-Type');
      console.log('📦 Tipo de contenido:', contentType);
      
      if (!contentType || !contentType.includes('application/pdf')) {
        console.warn('📦 Advertencia: El servidor no devolvió un PDF (Content-Type: ' + contentType + ')');
      }
      
      // Obtener el blob del PDF
      const blob = await response.blob();
      console.log('📦 Tamaño del blob recibido:', blob.size, 'bytes');
      
      if (blob.size < 100) {
        console.error('📦 Error: El blob recibido es demasiado pequeño para ser un PDF válido');
        throw new Error('El archivo PDF generado parece estar corrupto o incompleto');
      }
      
      // Crear URL para el blob
      const url = window.URL.createObjectURL(blob);
      console.log('📦 URL creada para el blob:', url);
      
      // Crear un elemento anchor para descargar
      const a = document.createElement('a');
      a.href = url;
      
      // Obtener nombre del archivo de las cabeceras Content-Disposition o usar nombre por defecto
      let filename = `etiqueta-envio-${order.orderNumber || order.id}.pdf`;
      const contentDisposition = response.headers.get('Content-Disposition');
      
      console.log('📦 Content-Disposition:', contentDisposition);
      
      if (contentDisposition) {
        const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          console.log('📦 Nombre de archivo extraído de cabeceras:', filename);
        }
      }
      
      a.download = filename;
      console.log('📦 Iniciando descarga con nombre:', filename);
      
      document.body.appendChild(a);
      a.click();
      
      // Limpieza
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('📦 Descarga de etiqueta completada con éxito');
      
      toast({
        title: "Etiqueta generada",
        description: "La etiqueta de envío ha sido generada y descargada correctamente"
      });
      
    } catch (error) {
      console.error('📦 Error al generar etiqueta:', error);
      toast({
        title: "Error al generar etiqueta",
        description: error instanceof Error ? error.message : "Error al generar la etiqueta de envío",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  // Obtener texto de estado
  const getStatusText = (status: string): string => {
    switch (status) {
      case "new": return "Nuevo";
      case "preparing": return "Preparando";
      case "shipped": return "Enviado";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  // Obtener color del badge de estado
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "outline" | "pending" | "status" | "info" => {
    switch (status) {
      case "completed": return "success";
      case "shipped": return "info";
      case "preparing": return "pending";
      case "new": return "status";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  // Obtener texto de estado de pago
  const getPaymentStatusText = (status: string): string => {
    switch (status) {
      case "pending": return "Pendiente";
      case "paid": return "Pagado";
      case "refunded": return "Reembolsado";
      default: return status;
    }
  };

  // Obtener color del badge de estado de pago
  const getPaymentStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "outline" => {
    switch (status) {
      case "paid": return "success";
      case "pending": return "secondary";
      case "refunded": return "destructive";
      default: return "outline";
    }
  };

  // Formato para moneda
  const formatCurrency = (amount: number | string | undefined): string => {
    if (amount === undefined || amount === null) return '$0.00';
    // Convertir a número si es un string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    // Verificar que sea un número válido
    if (isNaN(numericAmount)) return '$0.00';
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
  };

  // Formato para fechas
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
  };

  // Texto del método de pago
  const getPaymentMethodText = (method: string | null): string => {
    if (!method) return 'No especificado';
    switch (method) {
      case "cash": return "Efectivo";
      case "card": return "Tarjeta";
      case "transfer": return "Transferencia";
      case "paypal": return "PayPal";
      default: return method;
    }
  };

  // Texto del método de envío
  const getShippingMethodText = (method: string | null | undefined): string => {
    if (!method) return 'No especificado';
    switch (method) {
      case "pickup": return "Retiro en tienda";
      case "standard": return "Envío estándar";
      case "express": return "Envío express";
      default: return method;
    }
  };

  // Texto del origen
  const getSourceText = (source: string | null): string => {
    if (!source) return 'Directo';
    switch (source) {
      case "direct": return "Directo";
      case "woocommerce": return "WooCommerce";
      case "whatsapp": return "WhatsApp";
      case "instagram": return "Instagram";
      default: return source;
    }
  };

  // Texto de la marca
  const getBrandText = (brand: string | null): string => {
    if (!brand) return 'No especificado';
    switch (brand) {
      case "sleepwear": return "Civetta Sleepwear";
      case "bride": return "Civetta Bride";
      default: return brand;
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            {order.orderNumber || `ORD-${order.id ? order.id.toString().padStart(6, '0') : '000000'}`}
            {!order.items?.length && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Orden incompleta - Sin productos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>
          <p className="text-muted-foreground">
            Cliente: {order.customer?.name || (order.customerId ? `Cliente #${order.customerId}` : "Cliente no asignado")}
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-2 md:mt-0">
          <Badge variant={getStatusBadgeVariant(order.status)}>
            {getStatusText(order.status)}
          </Badge>
          <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
            {getPaymentStatusText(order.paymentStatus)}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Mensaje informativo para órdenes incompletas o del formulario web */}
      {(order.isFromWebForm || (!order.items?.length)) && (
        <div className={cn(
          "p-4 rounded-md flex items-start gap-3 mb-4",
          !order.items?.length 
            ? "bg-yellow-50 dark:bg-yellow-900/30" 
            : "bg-blue-50 dark:bg-blue-900"
        )}>
          {!order.items?.length ? (
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className={cn(
              "font-semibold",
              !order.items?.length 
                ? "text-yellow-800 dark:text-yellow-200"
                : "text-blue-800 dark:text-blue-200"
            )}>
              {!order.items?.length ? "Orden incompleta" : "Orden creada desde formulario web"}
            </h4>
            <p className={cn(
              "text-sm mt-1",
              !order.items?.length 
                ? "text-yellow-700 dark:text-yellow-300"
                : "text-blue-700 dark:text-blue-300"
            )}>
              {!order.items?.length 
                ? "Esta orden fue generada desde la web solo con información de envío. Por favor, completa la información del pedido."
                : "Esta orden fue creada desde el formulario de envío en la web. Por favor complete la información faltante, especialmente los detalles de productos y el valor total."
              }
            </p>
          </div>
        </div>
      )}

      {/* Información principal del pedido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="w-5 h-5 mr-2" /> Información de Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número:</span>
              <span className="font-medium">{order.orderNumber || `ORD-${order.id ? order.id.toString().padStart(6, '0') : '000000'}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha:</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marca:</span>
              <span>{getBrandText(order.brand)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Origen:</span>
              <span>{getSourceText(order.source)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Responsable:</span>
              <span>{order.assignedUser?.fullName || 'No asignado'}</span>
            </div>
            {order.notes && (
              <div className="mt-2">
                <span className="text-muted-foreground block mb-1">Notas:</span>
                <p className="bg-muted p-2 rounded text-xs">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="w-5 h-5 mr-2" /> Información de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                {getPaymentStatusText(order.paymentStatus)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método:</span>
              <span>{getPaymentMethodText(order.paymentMethod)}</span>
            </div>
            {order.paymentDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de pago:</span>
                <span>{formatDate(order.paymentDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(order.subtotal || 0)}</span>
            </div>
            {(order.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento:</span>
                <span className="text-red-500">-{formatCurrency(order.discount || 0)}</span>
              </div>
            )}
            {(order.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuestos:</span>
                <span>{formatCurrency(order.tax || 0)}</span>
              </div>
            )}
            {(order.shippingCost || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo de envío:</span>
                <span>{formatCurrency(order.shippingCost || 0)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información de envío */}
      <Card>
        <CardHeader className="pb-2 flex flex-row justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Truck className="w-5 h-5 mr-2" /> Información de Envío
          </CardTitle>
          {!order.id ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={true}
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Generar Etiqueta
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Este pedido debe guardarse primero antes de generar una etiqueta</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateShippingLabel}
              disabled={isGeneratingLabel || (!order.shippingAddress && !order.customer?.street)}
              className="flex items-center gap-2"
            >
              {isGeneratingLabel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Generar Etiqueta
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ShippingInfoCard 
            shippingMethod={order.shippingMethod}
            trackingNumber={order.trackingNumber}
            shippingCost={order.shippingCost}
            estimatedDeliveryDate={null}
            status={order.status}
            shippingAddress={
              (order.shippingAddress as any) ? {
                street: (order.shippingAddress as any).street || order.customer?.street || "No disponible",
                city: (order.shippingAddress as any).city || order.customer?.city || "No disponible",
                province: (order.shippingAddress as any).province || order.customer?.province || "No disponible",
                country: "Ecuador",
                postalCode: ""
              } : {
                street: order.customer?.street || "No disponible",
                city: order.customer?.city || "No disponible",
                province: order.customer?.province || "No disponible",
                country: "Ecuador",
                postalCode: ""
              }
            }
          />
        </CardContent>
      </Card>

      {/* Productos del pedido */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" /> Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName}
                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {Object.entries(item.attributes).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No hay productos en este pedido</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}