import React from "react";
import { Truck, MapPin, PackageOpen, Calendar, Info } from "lucide-react";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface ShippingAddress {
  street?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

interface ShippingInfoCardProps {
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  shippingCost?: number | null;
  estimatedDeliveryDate?: string | null;
  status?: string;
  shippingAddress: ShippingAddress;
}

export function ShippingInfoCard({
  shippingMethod,
  trackingNumber,
  shippingCost,
  estimatedDeliveryDate,
  status,
  shippingAddress
}: ShippingInfoCardProps) {
  // Formato para moneda
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "0,00 $";
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Obtener texto del método de envío
  const getShippingMethodText = (method: string | null | undefined): string => {
    if (!method) return 'No especificado';
    switch (method) {
      case "pickup": return "Retiro en tienda";
      case "standard": return "Envío estándar";
      case "express": return "Envío express";
      default: return method;
    }
  };

  // Obtener texto de estado
  const getStatusText = (status: string | undefined): string => {
    if (!status) return "Desconocido";
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
  const getStatusBadgeVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "success" | "outline" | "pending" | "status" | "info" => {
    if (!status) return "outline";
    switch (status) {
      case "completed": return "success";
      case "shipped": return "info";
      case "preparing": return "pending";
      case "new": return "status";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  // Formatear fecha estimada de entrega
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Renderizar la dirección de envío completa
  const renderFullAddress = (): string => {
    const { street, city, province, country, postalCode } = shippingAddress;
    const parts = [
      street,
      city,
      province,
      postalCode ? `CP: ${postalCode}` : '',
      country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  // Determinar si hay información de seguimiento
  const hasTrackingInfo = Boolean(trackingNumber);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Truck className="w-5 h-5 mr-2" /> Información de Envío
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método de envío:</span>
              <span>{getShippingMethodText(shippingMethod)}</span>
            </div>

            {hasTrackingInfo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número de seguimiento:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium underline decoration-dotted cursor-help">
                        {trackingNumber}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Usar este código para rastrear el paquete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {(shippingCost || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo de envío:</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
            )}

            {estimatedDeliveryDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega estimada:</span>
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  {formatDate(estimatedDeliveryDate)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado del pedido:</span>
              <Badge variant={getStatusBadgeVariant(status)}>
                {getStatusText(status)}
              </Badge>
            </div>
            
            {/* Dirección de envío */}
            <div className="mt-2">
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Dirección de envío:</span>
              </div>
              <p className="mt-1 text-sm border rounded-md p-2 bg-muted/50">
                {renderFullAddress()}
              </p>
            </div>

            {/* Mensaje sobre estado de envío */}
            {status === 'shipped' && (
              <div className="flex items-start mt-1 text-xs border-l-2 border-blue-500 pl-2 bg-blue-50 dark:bg-blue-950/20 p-1.5 rounded-sm">
                <Info className="h-3.5 w-3.5 mr-1.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>El paquete ha sido enviado y está en tránsito. Puede hacer seguimiento con el número proporcionado.</span>
              </div>
            )}
            
            {status === 'preparing' && (
              <div className="flex items-start mt-1 text-xs border-l-2 border-yellow-500 pl-2 bg-yellow-50 dark:bg-yellow-950/20 p-1.5 rounded-sm">
                <PackageOpen className="h-3.5 w-3.5 mr-1.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>Su pedido está siendo preparado para envío. Recibirá la información de seguimiento pronto.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}