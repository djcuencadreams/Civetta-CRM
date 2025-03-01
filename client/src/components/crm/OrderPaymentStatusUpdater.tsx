import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";

// Importar estas variantes desde Badge.tsx para mantener consistencia
import { BadgeProps } from "../ui/badge";
// Definir variantes con los valores específicos que usamos
type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "outline" | "pending" | "status" | "info";

const PAYMENT_STATUS_CONFIG: Record<string, {
  label: string;
  badgeVariant: BadgeVariant;
}> = {
  "pending": {
    label: "Pendiente",
    badgeVariant: "pending"
  },
  "paid": {
    label: "Pagado",
    badgeVariant: "success"
  },
  "refunded": {
    label: "Reembolsado",
    badgeVariant: "destructive"
  }
};

interface OrderPaymentStatusUpdaterProps {
  orderId: number;
  currentStatus: string;
  onStatusUpdated?: () => void;
}

export function OrderPaymentStatusUpdater({ 
  orderId, 
  currentStatus,
  onStatusUpdated
}: OrderPaymentStatusUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutación para actualizar el estado de pago
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string, notes?: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/payment-status`, { status, notes });
    },
    onSuccess: () => {
      toast({
        title: "Estado de pago actualizado",
        description: "El estado de pago ha sido actualizado correctamente",
      });
      
      // Primero invalidar las consultas y luego recargar explícitamente
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Forzar un refetch inmediato para asegurarnos de que los datos se actualicen
      queryClient.refetchQueries({ queryKey: ["/api/orders"] });
      
      // Agregar un mensaje de depuración
      console.log('Estado de pago actualizado, recargando datos...');
      
      // Llamar al callback de actualización proporcionado
      if (onStatusUpdated) {
        console.log('Ejecutando callback onStatusUpdated');
        onStatusUpdated();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al actualizar el estado de pago: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Recuperar la configuración del estado actual
  const currentConfig = PAYMENT_STATUS_CONFIG[currentStatus] || PAYMENT_STATUS_CONFIG.pending;
  
  // Manejar el cambio de estado de pago
  const handlePaymentStatusChange = (newStatus: string) => {
    // Si se reembolsa, solicitar notas
    if (newStatus === "refunded") {
      const notes = window.prompt("Por favor, indique el motivo del reembolso:");
      if (notes !== null) {
        updatePaymentStatusMutation.mutate({ status: newStatus, notes });
      }
    } else {
      updatePaymentStatusMutation.mutate({ status: newStatus });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          {updatePaymentStatusMutation.isPending ? (
            <Badge variant="outline" className="cursor-not-allowed">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Actualizando...
            </Badge>
          ) : (
            <Badge variant={currentConfig.badgeVariant} className="cursor-pointer hover:bg-accent">
              {currentConfig.label}
            </Badge>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cambiar estado de pago</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlePaymentStatusChange("pending")}>
          Pendiente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePaymentStatusChange("paid")}>
          Pagado
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handlePaymentStatusChange("refunded")}
          className="text-red-600"
        >
          Reembolsado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}