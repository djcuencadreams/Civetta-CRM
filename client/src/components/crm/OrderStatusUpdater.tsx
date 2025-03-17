import React, { useState } from "react";
import { CheckCircle2, Truck, Package, Loader2, XCircle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { useIsMobile } from "@/hooks/use-is-mobile";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderStatusUpdaterProps {
  orderId: number;
  currentStatus: string;
  currentPaymentStatus: string;
  onStatusUpdate: () => void;
}

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  currentPaymentStatus,
  onStatusUpdate,
}: OrderStatusUpdaterProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");

  // Configuración de estados
  const statusConfig = {
    new: {
      label: "Nuevo",
      icon: <Clock className="h-4 w-4" />,
      color: "bg-gray-100 text-gray-700",
      nextStatus: "preparing",
      nextLabel: "Preparar pedido",
    },
    preparing: {
      label: "Preparando",
      icon: <Package className="h-4 w-4" />,
      color: "bg-yellow-100 text-yellow-700",
      nextStatus: "shipped",
      nextLabel: "Marcar como enviado",
    },
    shipped: {
      label: "Enviado",
      icon: <Truck className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-700",
      nextStatus: "completed",
      nextLabel: "Completar pedido",
    },
    completed: {
      label: "Completado",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-green-100 text-green-700",
      nextStatus: null,
      nextLabel: null,
    },
    cancelled: {
      label: "Cancelado",
      icon: <XCircle className="h-4 w-4" />,
      color: "bg-red-100 text-red-700",
      nextStatus: null,
      nextLabel: null,
    },
  };

  // Estado actual
  const currentStatusConfig = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.new;

  // Función para actualizar el estado del pedido
  const updateOrderStatus = async (status: string) => {
    if (!status || status === currentStatus) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes: statusNote || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Estado actualizado",
          description: `El pedido ahora está ${statusConfig[status as keyof typeof statusConfig]?.label.toLowerCase() || status}`,
        });
        onStatusUpdate();
      } else {
        throw new Error(data?.message || "Error al actualizar el estado");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido",
        variant: "destructive",
      });
      console.error("Error updating order status:", error);
    } finally {
      setIsUpdating(false);
      setIsDialogOpen(false);
      setStatusNote("");
    }
  };

  // Iniciar cambio de estado
  const initiateStatusChange = (status: string) => {
    setNewStatus(status);
    setIsDialogOpen(true);
  };

  // Comprobar si el pedido no puede avanzar debido al estado de pago
  const isBlocked = currentStatus !== "cancelled" && 
                  currentPaymentStatus === "pending" && 
                  currentStatusConfig.nextStatus === "completed";

  return (
    <>
      <div className={cn("flex flex-col gap-2", isMobile && "w-full")}>
        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className={cn(
              "h-7 px-2 flex items-center font-normal", 
              currentStatusConfig.color
            )}
          >
            {currentStatusConfig.icon}
            <span className="ml-1">{currentStatusConfig.label}</span>
          </Badge>
          
          {currentStatusConfig.nextStatus && (
            <Button
              variant="outline"
              size="sm"
              className={cn("flex items-center", isMobile && "flex-grow justify-center")}
              onClick={() => initiateStatusChange(currentStatusConfig.nextStatus!)}
              disabled={isUpdating || isBlocked}
            >
              {isUpdating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <span>{currentStatusConfig.nextLabel}</span>
              )}
            </Button>
          )}
          
          {/* Si el pedido no está cancelado, mostrar opción de cancelar */}
          {currentStatus !== "cancelled" && !isUpdating && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => initiateStatusChange("cancelled")}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
        
        {isBlocked && (
          <div className="text-xs text-yellow-600 italic flex items-center mt-1">
            <Info className="h-3 w-3 mr-1" />
            El pedido debe ser pagado antes de completarlo
          </div>
        )}
      </div>

      {/* Diálogo de confirmación */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {newStatus === "cancelled" 
                ? "¿Cancelar este pedido?" 
                : `¿Cambiar estado a ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {newStatus === "cancelled"
                ? "Esta acción marcará el pedido como cancelado. Esto no puede deshacerse automáticamente."
                : "Esta acción actualizará el estado del pedido y notificará al cliente si está configurado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <Textarea
              placeholder="Añadir nota sobre este cambio de estado (opcional)"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => newStatus && updateOrderStatus(newStatus)}
              className={cn(
                newStatus === "cancelled" ? "bg-red-600 hover:bg-red-700" : ""
              )}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}