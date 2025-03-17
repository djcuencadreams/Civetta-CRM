import React from 'react';
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
  DollarSign
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShippingInfoCard } from './ShippingInfoCard';

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
    woocommerceId: number | null;
    assignedUserId?: number | null;
    shippingMethod?: string | null;
    trackingNumber?: string | null;
    shippingCost?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    paymentDate?: string | null;
    customer?: {
      name: string;
      id: number;
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
  if (!order) {
    return <div>No se encontró información del pedido</div>;
  }

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
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
          <h3 className="text-2xl font-bold">
            {order.orderNumber || `ORD-${order.id.toString().padStart(6, '0')}`}
          </h3>
          <p className="text-muted-foreground">
            Cliente: {order.customer?.name || `Cliente #${order.customerId}`}
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
              <span className="font-medium">{order.orderNumber || `ORD-${order.id.toString().padStart(6, '0')}`}</span>
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
      <ShippingInfoCard 
        shippingMethod={order.shippingMethod}
        trackingNumber={order.trackingNumber}
        shippingCost={order.shippingCost}
        estimatedDeliveryDate={null} // Se podría agregar esta propiedad en el futuro
        status={order.status}
        shippingAddress={{
          street: "Dirección del cliente", // Estos datos podrían obtenerse del cliente en una implementación futura
          city: "Ciudad",
          province: "Provincia",
          country: "Ecuador",
          postalCode: ""
        }}
      />

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