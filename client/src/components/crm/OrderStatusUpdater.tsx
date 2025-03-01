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
type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeVariant: BadgeVariant;
}> = {
  "new": {
    label: "Nuevo",
    badgeVariant: "outline"
  },
  "preparing": {
    label: "Preparando",
    badgeVariant: "secondary"
  },
  "shipped": {
    label: "Enviado",
    badgeVariant: "default"
  },
  "completed": {
    label: "Completado",
    badgeVariant: "success"
  },
  "cancelled": {
    label: "Cancelado",
    badgeVariant: "destructive"
  }
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutación para actualizar el estado
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string, reason?: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, reason });
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del pedido ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (onStatusUpdated) onStatusUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al actualizar el estado: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Recuperar la configuración del estado actual
  const currentConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;
  
  // Manejar el cambio de estado
  const handleStatusChange = (newStatus: string) => {
    // Si se cancela, solicitar razón
    if (newStatus === "cancelled") {
      const reason = window.prompt("Por favor, indique el motivo de la cancelación:");
      if (reason !== null) {
        updateStatusMutation.mutate({ status: newStatus, reason });
      }
    } else {
      updateStatusMutation.mutate({ status: newStatus });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          {updateStatusMutation.isPending ? (
            <Badge variant="outline" className="cursor-not-allowed">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Actualizando...
            </Badge>
          ) : (
            <Badge variant={currentConfig.badgeVariant} className="cursor-pointer">
              {currentConfig.label}
            </Badge>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStatusChange("new")}>
          Nuevo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("preparing")}>
          Preparando
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("shipped")}>
          Enviado
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
          Completado
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleStatusChange("cancelled")}
          className="text-red-600"
        >
          Cancelar pedido
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}