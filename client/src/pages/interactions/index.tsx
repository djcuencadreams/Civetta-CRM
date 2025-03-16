import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from "../../components/ui/alert";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { InteractionsList } from '../../components/interactions/InteractionsList';
import { InteractionFilters } from '../../components/interactions/InteractionFilters';
import { Plus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { CreateInteractionDialog } from '../../components/interactions/CreateInteractionDialog';

export default function InteractionsPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    query: '',
    contactType: '',
    contactId: '',
    channel: '',
    type: '',
    assignedUserId: '',
    dateFrom: '',
    dateTo: '',
  });

  // Consulta de interacciones
  const { data, isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/interactions', filters],
    queryFn: async ({ queryKey }) => {
      const [_, currentFilters] = queryKey;
      
      // Construir URL con parámetros de filtro
      const params = new URLSearchParams();
      
      // Usar Object.entries de forma segura con 'as' para la asignación de tipos
      Object.entries(currentFilters as Record<string, string>).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/interactions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar las interacciones');
      }
      return response.json();
    },
  });

  // Manejador para aplicar filtros
  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
  };

  // Manejador para resetear filtros
  const handleResetFilters = () => {
    setFilters({
      query: '',
      contactType: '',
      contactId: '',
      channel: '',
      type: '',
      assignedUserId: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Manejador para crear una nueva interacción
  const handleCreateInteraction = () => {
    setShowCreateDialog(true);
  };

  // Manejador para cerrar el diálogo de creación
  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
  };

  // Manejador para después de crear una interacción
  const handleInteractionCreated = () => {
    setShowCreateDialog(false);
    refetch();
    toast({
      title: 'Interacción creada',
      description: 'La interacción ha sido creada correctamente.',
    });
  };

  return (
    <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interacciones</h1>
            <p className="text-muted-foreground">
              Gestiona las comunicaciones con clientes y leads
            </p>
          </div>
          <Button onClick={handleCreateInteraction}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Interacción
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Panel de filtros */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Refina las interacciones</CardDescription>
            </CardHeader>
            <CardContent>
              <InteractionFilters 
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onResetFilters={handleResetFilters}
              />
            </CardContent>
          </Card>

          {/* Lista de interacciones */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Interacciones</CardTitle>
                <CardDescription>
                  {data?.length 
                    ? `Mostrando ${data.length} interacciones` 
                    : 'Sin interacciones que mostrar'}
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error al cargar las interacciones. Por favor, inténtalo de nuevo.
                    </AlertDescription>
                  </Alert>
                ) : data && data.length > 0 ? (
                  <InteractionsList interactions={data} onRefresh={refetch} />
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      No hay interacciones que coincidan con los filtros aplicados.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={handleResetFilters}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Diálogo para crear una nueva interacción */}
        {showCreateDialog && (
          <CreateInteractionDialog 
            open={showCreateDialog} 
            onClose={handleCloseCreateDialog}
            onCreated={handleInteractionCreated}
          />
        )}
    </div>
  );
}