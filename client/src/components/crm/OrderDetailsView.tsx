import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, 
  Truck, 
  CreditCard, 
  User, 
  FileDown,
  AlertTriangle,
  Info,
  Loader2,
  AlertCircle
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
    totalAmount: number | string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    source: string | null;
    brand: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    wooCommerceId: number | null;
    assignedUserId?: number | null;
    shippingMethod?: string | null;
    trackingNumber?: string | null;
    shippingCost?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    paymentDate?: string | null;
    isFromWebForm?: boolean;
    shippingAddress?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
      document?: string;
      idNumber?: string;
      street?: string;
      address?: string;
      city?: string;
      province?: string;
      instructions?: string;
      deliveryInstructions?: string;
    };
    customer?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
      document?: string;
      idNumber?: string;
      street?: string;
      address?: string;
      city?: string;
      province?: string;
      deliveryInstructions?: string;
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

export function OrderDetailsView({ order: initialOrder }: OrderDetailsProps) {
  const { toast } = useToast();
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [order, setOrder] = useState(initialOrder);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  // Fetch customer data if not present
  useEffect(() => {
    const fetchCustomerData = async () => {
      // Verificar si tenemos customerId y si necesitamos cargar el cliente
      if (order?.customerId && (!order.customer || Object.keys(order.customer).length === 0)) {
        setIsLoadingCustomer(true);
        try {
          const response = await fetch(`/api/customers/${order.customerId}`);
          if (!response.ok) throw new Error('Failed to fetch customer');
          const customerData = await response.json();
          
          const updatedOrder = {
            ...order,
            customer: customerData
          };

          // Mantener datos de envío si existen
          if (order.shippingAddress) {
            updatedOrder.customer = {
              ...updatedOrder.customer,
              address: order.shippingAddress.street || customerData.address,
              city: order.shippingAddress.city || customerData.city,
              province: order.shippingAddress.province || customerData.province
            };
          }

          setOrder(updatedOrder);
        } catch (error) {
          console.error('Error fetching customer:', error);
          toast({
            title: "Error",
            description: "No se pudo cargar la información del cliente",
            variant: "destructive"
          });
        } finally {
          setIsLoadingCustomer(false);
        }
      }
    };

    fetchCustomerData();
  }, [order?.customerId]);

  console.log('OrderDetailsView - Full order data:', order);

  if (!order) {
    return <div>No se encontró información del pedido</div>;
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case "new": return "Nuevo";
      case "preparing": return "Preparando";
      case "shipped": return "Enviado";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      case "pendiente_de_completar": return "Pendiente de completar";
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "outline" | "pending" | "status" | "info" => {
    switch (status) {
      case "completed": return "success";
      case "shipped": return "info";
      case "preparing": return "pending";
      case "new": return "status";
      case "cancelled": return "destructive";
      case "pendiente_de_completar": return "pending";
      default: return "outline";
    }
  };

  const getPaymentStatusText = (status: string): string => {
    switch (status) {
      case "pending": return "Pendiente";
      case "paid": return "Pagado";
      case "refunded": return "Reembolsado";
      default: return status;
    }
  };

  const getPaymentStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "outline" => {
    switch (status) {
      case "paid": return "success";
      case "pending": return "secondary";
      case "refunded": return "destructive";
      default: return "outline";
    }
  };

  const formatCurrency = (amount: number | string | undefined): string => {
    if (amount === undefined || amount === null) return '$0.00';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '$0.00';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
  };

  const getSourceText = (source: string | null): string => {
    if (!source) return 'Directo';
    switch (source) {
      case "direct": return "Directo";
      case "woocommerce": return "WooCommerce";
      case "whatsapp": return "WhatsApp";
      case "instagram": return "Instagram";
      case "website": return "Sitio Web";
      default: return source;
    }
  };

  const getBrandText = (brand: string | null): string => {
    if (!brand) return 'No especificado';
    switch (brand) {
      case "sleepwear": return "Civetta Sleepwear";
      case "bride": return "Civetta Bride";
      default: return brand;
    }
  };

  const handleGenerateShippingLabel = async () => {
    try {
      setIsGeneratingLabel(true);

      if (!order.id) {
        throw new Error('No se puede generar la etiqueta: ID de pedido no válido');
      }

      const response = await fetch(`/api/shipping/label/${order.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al generar la etiqueta de envío (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-envio-${order.orderNumber || order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Etiqueta generada",
        description: "La etiqueta de envío ha sido generada y descargada correctamente"
      });

    } catch (error) {
      toast({
        title: "Error al generar etiqueta",
        description: error instanceof Error ? error.message : "Error al generar la etiqueta de envío",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            {order.orderNumber || `ORD-${order.id ? order.id.toString().padStart(6, '0') : '000000'}`}
            {(!order.items || order.items.length === 0) && (
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
                : "Esta orden fue creada desde el formulario de envío en la web. Por favor complete la información faltante."
              }
            </p>
          </div>
        </div>
      )}

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
              <User className="w-5 h-5 mr-2" /> Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(order?.customer || order?.shippingAddress) ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre completo:</span>
                  <span className="font-medium text-right">
                    {`${order.customer?.firstName || order.shippingAddress?.firstName || ""} ${order.customer?.lastName || order.shippingAddress?.lastName || ""}`.trim() || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="text-right">
                    {order.customer?.document || order.customer?.idNumber || order.shippingAddress?.document || order.shippingAddress?.idNumber || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-right">
                    {order.customer?.email || order.shippingAddress?.email || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="text-right">
                    {order.customer?.phone || order.shippingAddress?.phone || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="text-right max-w-[60%]">
                    {order.shippingAddress?.street || order.customer?.street || order.customer?.address || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ciudad:</span>
                  <span className="text-right">
                    {order.customer?.city || order.shippingAddress?.city || "No especificado"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provincia:</span>
                  <span className="text-right">
                    {order.customer?.province || order.shippingAddress?.province || "No especificado"}
                  </span>
                </div>

                {(order.shippingAddress?.deliveryInstructions || order.customer?.deliveryInstructions) && (
                  <div className="mt-2">
                    <span className="text-muted-foreground block mb-1">Instrucciones de entrega:</span>
                    <p className="bg-muted p-2 rounded text-xs">
                      {order.shippingAddress?.deliveryInstructions || order.customer?.deliveryInstructions}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                <p>❗ No se encontró información del cliente</p>
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

      <Card>
        <CardHeader className="pb-2 flex flex-row justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Truck className="w-5 h-5 mr-2" /> Información de Envío
          </CardTitle>
          {!order.id || (!order.shippingAddress && !order.customer) ? (
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
                  <p>{!order.id ? "Este pedido debe guardarse primero" : "Se requiere información de envío"} antes de generar una etiqueta</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateShippingLabel}
              disabled={isGeneratingLabel}
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
            shippingAddress={{
              street: order.customer?.address || order.customer?.street || order.shippingAddress?.address || order.shippingAddress?.street || "No disponible",
              city: order.customer?.city || order.shippingAddress?.city || "No disponible",
              province: order.customer?.province || order.shippingAddress?.province || "No disponible",
              country: "Ecuador",
              postalCode: ""
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Package className="w-5 h-5 mr-2" /> Productos
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
              {!order.items || order.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-yellow-600 dark:text-yellow-500">
                      <AlertTriangle className="h-8 w-8" />
                      <p className="font-medium">Orden pendiente de completar</p>
                      <p className="text-sm text-muted-foreground">Esta orden no tiene productos agregados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
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
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}