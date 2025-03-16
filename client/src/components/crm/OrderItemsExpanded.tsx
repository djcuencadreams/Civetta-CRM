import React from "react";
import { Package, Tags } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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