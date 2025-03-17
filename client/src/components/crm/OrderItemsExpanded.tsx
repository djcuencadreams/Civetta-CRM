import React from "react";
import { Package, Tags, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Tipo de dato para los ítems de una orden
interface OrderItem {
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
}

interface OrderItemsExpandedProps {
  items?: OrderItem[];
}

export function OrderItemsExpanded({ items = [] }: OrderItemsExpandedProps) {
  const isMobile = useIsMobile();
  
  if (!items || items.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground text-sm">
        <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
        Este pedido no tiene productos registrados.
      </div>
    );
  }

  // Función para formatear precio en formato de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Función para renderizar los atributos del producto (talla, color, etc)
  const renderAttributes = (attributes?: Record<string, any>) => {
    if (!attributes || Object.keys(attributes).length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(attributes).map(([key, value]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {key}: {value}
          </Badge>
        ))}
      </div>
    );
  };

  // Vista para móviles: tarjetas en lugar de tabla
  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="font-medium">{item.productName}</div>
              
              {renderAttributes(item.attributes)}
              
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="float-right font-medium">
                    {formatCurrency(item.unitPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cantidad:</span>
                  <span className="float-right font-medium">
                    {item.quantity}
                  </span>
                </div>
                
                {item.discount > 0 && (
                  <div>
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="float-right text-green-600">
                      -{(item.discount * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="float-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
              
              {item.productId && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center">
                  <Tags className="h-3 w-3 mr-1" />
                  ID: {item.productId}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        <Separator className="my-2" />
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-base font-semibold">
            <DollarSign className="h-4 w-4 mr-1" />
            Total:
          </div>
          <div className="font-bold">
            {formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0))}
          </div>
        </div>
      </div>
    );
  }

  // Vista para escritorio: tabla tradicional
  return (
    <div className="overflow-x-auto">
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Producto</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-center">Cantidad</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="font-medium">{item.productName}</span>
                  {renderAttributes(item.attributes)}
                  
                  {item.productId && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Tags className="h-3 w-3 mr-1" />
                      ID: {item.productId}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unitPrice)}
                {item.discount > 0 && (
                  <div className="text-xs text-green-600">
                    -{(item.discount * 100).toFixed(0)}%
                  </div>
                )}
              </TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.subtotal)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} className="text-right font-semibold">Total:</TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}