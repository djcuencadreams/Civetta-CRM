import React from 'react';
import { DollarSign, CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderPaymentSummaryProps {
  totalAmount: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  shippingCost?: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  onUpdatePayment?: () => void;
  className?: string;
  compact?: boolean;
}

export function OrderPaymentSummary({
  totalAmount,
  subtotal,
  tax = 0,
  discount = 0,
  shippingCost = 0,
  paymentStatus,
  paymentMethod,
  paymentDate,
  onUpdatePayment,
  className,
  compact = false,
}: OrderPaymentSummaryProps) {
  // Formato para moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Obtener texto y configuración para estado de pago
  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Pagado',
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'bg-green-100 text-green-700',
          variant: 'success' as const,
        };
      case 'pending':
        return {
          label: 'Pendiente',
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-700',
          variant: 'secondary' as const,
        };
      case 'refunded':
        return {
          label: 'Reembolsado',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-red-100 text-red-700',
          variant: 'destructive' as const,
        };
      default:
        return {
          label: status,
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-700',
          variant: 'outline' as const,
        };
    }
  };

  // Obtener texto del método de pago
  const getPaymentMethodText = (method: string | null | undefined): string => {
    if (!method) return 'No especificado';
    switch (method) {
      case "cash": return "Efectivo";
      case "card": return "Tarjeta";
      case "transfer": return "Transferencia";
      case "paypal": return "PayPal";
      default: return method;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Pendiente';
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
  };

  const statusConfig = getPaymentStatusConfig(paymentStatus);

  if (compact) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="py-2 px-4 bg-muted">
          <CardTitle className="text-sm flex items-center">
            <DollarSign className="w-4 h-4 mr-1" /> Resumen de pago
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium">Estado:</span>
            <Badge variant={statusConfig.variant} className="flex items-center">
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
          {onUpdatePayment && paymentStatus !== 'paid' && (
            <Button 
              size="sm" 
              className="w-full mt-2" 
              onClick={onUpdatePayment}
            >
              Registrar pago
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <CreditCard className="w-5 h-5 mr-2" /> Información de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estado:</span>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Método:</span>
          <span>{getPaymentMethodText(paymentMethod)}</span>
        </div>
        {paymentDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha de pago:</span>
            <span>{formatDate(paymentDate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuento:</span>
            <span className="text-red-500">-{formatCurrency(discount)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Impuestos:</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        )}
        {shippingCost > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo de envío:</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        
        {onUpdatePayment && paymentStatus !== 'paid' && (
          <Button 
            className="w-full mt-3" 
            onClick={onUpdatePayment}
          >
            Registrar pago
          </Button>
        )}
      </CardContent>
    </Card>
  );
}