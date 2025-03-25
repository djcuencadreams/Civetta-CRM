import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderDetailsView } from './OrderDetailsView';

type Order = {
  id: number;
  customerId: number;
  leadId: number | null;
  orderNumber: string | null;
  totalAmount: number | string; // Puede venir como string "0.00" del backend
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  source: string | null;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  wooCommerceId: number | null; // Nombre correcto desde la API
  assignedUserId?: number | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  shippingCost?: number | string; // Puede venir como string "0.00" desde el backend
  tax?: number | string; // Puede venir como string "0.00" desde el backend
  discount?: number | string; // Puede venir como string "0.00" desde el backend
  subtotal?: number | string; // Puede venir como string "0.00" desde el backend 
  paymentDate?: string | null;
  isFromWebForm?: boolean; // Flag para órdenes del formulario web
  shippingAddress?: Record<string, any>; // Para direcciones de envío
  billingAddress?: Record<string, any>; // Para direcciones de facturación
  customer?: {
    name: string;
    id: number;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
  };
  assignedUser?: {
    id: number;
    fullName: string;
  } | null;
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

type OrderDetailsSheetProps = {
  orderId: number;
  onEdit?: (order: Order) => void;
};

export function OrderDetailsSheet({ orderId, onEdit }: OrderDetailsSheetProps) {
  // Cargar los detalles del pedido por ID
  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando detalles del pedido...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">Error al cargar los detalles del pedido</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div>
      <OrderDetailsView order={order} />
      
      {onEdit && (
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={() => onEdit(order)}
            className="gap-2"
          >
            Editar Pedido
          </Button>
        </div>
      )}
    </div>
  );
}