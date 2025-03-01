import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

// Estados de pedido disponibles y sus transiciones permitidas
type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const orderStatuses: Record<string, {
  label: string;
  allowedTransitions: string[];
  color: string;
  badgeVariant: BadgeVariant;
}> = {
  new: {
    label: "Nuevo Pedido",
    allowedTransitions: ["preparing", "cancelled"],
    color: "default",
    badgeVariant: "secondary"
  },
  preparing: {
    label: "Preparando Pedido",
    allowedTransitions: ["shipped", "cancelled"],
    color: "secondary",
    badgeVariant: "default"
  },
  shipped: {
    label: "Enviado",
    allowedTransitions: ["completed", "cancelled"],
    color: "blue",
    badgeVariant: "secondary"
  },
  completed: {
    label: "Completado",
    allowedTransitions: [],
    color: "green",
    badgeVariant: "outline"
  },
  cancelled: {
    label: "Cancelado",
    allowedTransitions: [],
    color: "destructive",
    badgeVariant: "destructive"
  },
};

interface OrderStatusUpdaterProps {
  orderId: number;
  currentStatus: string;
  onStatusUpdated?: () => void;
}

export function OrderStatusUpdater({ 
  orderId, 
  currentStatus,
  onStatusUpdated 
}: OrderStatusUpdaterProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener las transiciones permitidas para el estado actual
  const allowedTransitions = orderStatuses[currentStatus as keyof typeof orderStatuses]?.allowedTransitions || [];

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/sales/${orderId}/status`, { 
        status: newStatus,
        reason: reason.trim() || undefined
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar el estado del pedido");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ 
        title: "Estado actualizado",
        description: `El pedido ha sido actualizado a: ${orderStatuses[newStatus as keyof typeof orderStatuses]?.label || newStatus}`
      });
      if (onStatusUpdated) {
        onStatusUpdated();
      }
      setNewStatus("");
      setReason("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al actualizar el estado",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // No mostrar el componente si no hay transiciones permitidas
  if (allowedTransitions.length === 0) {
    return null;
  }

  // Determinar si se necesita motivo (obligatorio para cancelaciones)
  const requiresReason = newStatus === 'cancelled';
  const showReasonField = newStatus === 'cancelled';

  return (
    <div className="mt-3 pt-3 border-t space-y-3 bg-muted p-4 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium block text-primary">Cambiar Estado del Pedido:</span>
        <Badge 
          variant={orderStatuses[currentStatus as keyof typeof orderStatuses]?.badgeVariant || "default"}
          className="ml-2"
        >
          Estado actual: {orderStatuses[currentStatus as keyof typeof orderStatuses]?.label || currentStatus}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Select
          value={newStatus}
          onValueChange={setNewStatus}
        >
          <SelectTrigger className="w-full border-primary/50">
            <SelectValue placeholder="Seleccionar nuevo estado" />
          </SelectTrigger>
          <SelectContent>
            {allowedTransitions.map((status) => (
              <SelectItem key={status} value={status}>
                {orderStatuses[status as keyof typeof orderStatuses]?.label || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {showReasonField && (
        <div className="mt-2">
          <Textarea
            placeholder={requiresReason ? "Motivo de cancelación (requerido)" : "Motivo del cambio (opcional)"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      )}
      
      <div className="flex justify-end">
        <Button 
          size="sm"
          variant={newStatus === 'cancelled' ? 'destructive' : 'default'}
          disabled={
            !newStatus || 
            updateStatusMutation.isPending || 
            (requiresReason && !reason.trim())
          }
          onClick={() => newStatus && updateStatusMutation.mutate()}
          className="font-medium"
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          {newStatus === 'cancelled' ? 'Cancelar Pedido' : 'Actualizar Estado'}
        </Button>
      </div>
    </div>
  );
}