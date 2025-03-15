import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlusCircle, Filter, Calendar, DollarSign, RefreshCw, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

// Definición de interfaces
interface Opportunity {
  id: number;
  name: string;
  customerId?: number | null;
  leadId?: number | null;
  customer_name?: string;
  lead_name?: string;
  estimatedValue: number;
  probability?: number | null;
  status: string;
  stage: string;
  assignedUserId?: number | null;
  assigned_user_name?: string;
  estimatedCloseDate?: string | null;
  notes?: string | null;
  productsInterested?: any[] | null;
  nextActionDate?: string | null;
  brand: string;
  createdAt?: string;
  updatedAt?: string;
}

// Definición del tipo de columna para el Kanban
interface StageColumn {
  id: string;
  title: string;
  opportunities: Opportunity[];
}

export default function OpportunitiesPage() {
  const { toast } = useToast();
  const [columns, setColumns] = useState<StageColumn[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('sleepwear');
  const [filter, setFilter] = useState<{
    assignedUser: string;
    brand: string;
    status: string;
  }>({
    assignedUser: 'all',
    brand: 'all',
    status: 'all',
  });

  // Obtener etapas del pipeline según la marca seleccionada
  const { data: stagesData, isLoading: stagesLoading } = useQuery({
    queryKey: [`/api/opportunities/pipeline-stages/${selectedBrand}`],
    enabled: !!selectedBrand
  });

  // Obtener oportunidades
  const { 
    data: opportunitiesData, 
    isLoading: opportunitiesLoading,
    refetch: refetchOpportunities 
  } = useQuery({
    queryKey: ['/api/opportunities'],
    enabled: true
  });

  // Organizar oportunidades por etapas
  useEffect(() => {
    if (stagesData && Array.isArray(stagesData)) {
      setStages(stagesData);
    }
  }, [stagesData]);

  useEffect(() => {
    if (!opportunitiesData || !Array.isArray(opportunitiesData) || stages.length === 0) {
      return;
    }
    
    try {
      // Filtrar oportunidades según los filtros seleccionados
      const filteredOpportunities = opportunitiesData.filter((opportunity: Opportunity) => {
        let match = true;
        
        if (filter.assignedUser !== 'all' && opportunity.assigned_user_name !== filter.assignedUser) {
          match = false;
        }
        
        if (filter.brand !== 'all' && opportunity.brand !== filter.brand) {
          match = false;
        }
        
        if (filter.status !== 'all' && opportunity.status !== filter.status) {
          match = false;
        }
        
        return match;
      });

      // Crear columnas para cada etapa
      const stageColumns = stages.map(stage => {
        return {
          id: stage,
          title: stage,
          opportunities: filteredOpportunities.filter((opp: Opportunity) => 
            opp && opp.stage === stage
          ) || []
        };
      });
      
      setColumns(stageColumns);
    } catch (error) {
      console.error("Error al procesar oportunidades:", error);
    }
  }, [opportunitiesData, stages, filter]);

  // Manejador para arrastrar y soltar oportunidades
  const handleDragEnd = async (result: any) => {
    try {
      const { source, destination, draggableId } = result;
      
      // Si no hay destino o es el mismo que el origen, no hacer nada
      if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
        return;
      }
      
      // Encontrar columnas de origen y destino
      const sourceColumn = columns.find(col => col.id === source.droppableId);
      const destColumn = columns.find(col => col.id === destination.droppableId);
      
      if (!sourceColumn || !destColumn) {
        console.warn("No se encontró la columna de origen o destino");
        return;
      }
      
      // Crear copias para manipular
      const sourceOpportunities = [...sourceColumn.opportunities];
      const destOpportunities = sourceColumn === destColumn ? 
        sourceOpportunities : [...destColumn.opportunities];
      
      // Verificar que tenemos un índice válido
      if (source.index >= sourceOpportunities.length) {
        console.warn("Índice de origen fuera de rango", source.index, sourceOpportunities.length);
        return;
      }
      
      // Obtener la oportunidad que se arrastra
      const [movedOpportunity] = sourceOpportunities.splice(source.index, 1);
      
      if (!movedOpportunity) {
        console.warn("No se pudo obtener la oportunidad a mover");
        return;
      }
      
      // Si se mueve dentro de la misma columna (reordenar)
      if (sourceColumn === destColumn) {
        destOpportunities.splice(destination.index, 0, movedOpportunity);
        
        const newColumns = columns.map(col => {
          if (col.id === sourceColumn.id) {
            return {
              ...col,
              opportunities: destOpportunities
            };
          }
          return col;
        });
        
        setColumns(newColumns);
      } else {
        // Si se mueve a otra columna, actualizar la etapa en la base de datos
        try {
          // Actualizar localmente para UI instantánea
          const updatedOpportunity = {...movedOpportunity, stage: destColumn.id};
          destOpportunities.splice(destination.index, 0, updatedOpportunity);
          
          const newColumns = columns.map(col => {
            if (col.id === sourceColumn.id) {
              return {
                ...col,
                opportunities: sourceOpportunities
              };
            }
            if (col.id === destColumn.id) {
              return {
                ...col,
                opportunities: destOpportunities
              };
            }
            return col;
          });
          
          setColumns(newColumns);
          
          // Actualizar en el servidor
          await apiRequest(
            'PATCH',
            `/api/opportunities/${draggableId}/stage`, 
            { stage: destColumn.id }
          );
          
          toast({
            title: 'Etapa actualizada',
            description: `La oportunidad ha sido movida a "${destColumn.title}"`,
          });
        } catch (error) {
          console.error('Error actualizando etapa:', error);
          toast({
            title: 'Error',
            description: 'No se pudo actualizar la etapa de la oportunidad',
            variant: 'destructive',
          });
          
          // Revertir cambios en caso de error
          refetchOpportunities();
        }
      }
    } catch (error) {
      console.error("Error en la función de arrastrar y soltar:", error);
      // Asegurar que la interfaz se actualice en caso de error
      refetchOpportunities();
    }
  };

  // Renderizar esqueletos de carga
  if (stagesLoading || opportunitiesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Pipeline de Oportunidades</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-background p-4 rounded-md border">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Pipeline de Oportunidades</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select 
            value={selectedBrand} 
            onValueChange={(value) => {
              setSelectedBrand(value);
              // Si el filtro de marca no es "all", actualizar para reflejar la marca seleccionada
              if (filter.brand !== 'all') {
                setFilter({...filter, brand: value});
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sleepwear">Civetta Sleepwear</SelectItem>
              <SelectItem value="bride">Civetta Bride</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="sm" variant="outline" onClick={() => refetchOpportunities()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          
          <Button size="sm" asChild>
            <Link href="/opportunities/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Oportunidad
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={filter.assignedUser} 
          onValueChange={(value) => setFilter({...filter, assignedUser: value})}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            {/* Aquí irían todos los usuarios disponibles obtenidos de la API */}
            <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
            <SelectItem value="María López">María López</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filter.brand} 
          onValueChange={(value) => setFilter({...filter, brand: value})}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            <SelectItem value="sleepwear">Civetta Sleepwear</SelectItem>
            <SelectItem value="bride">Civetta Bride</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filter.status} 
          onValueChange={(value) => setFilter({...filter, status: value})}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="negotiation">Negociación</SelectItem>
            <SelectItem value="closed_won">Cerrado Ganado</SelectItem>
            <SelectItem value="closed_lost">Cerrado Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Separator className="mb-6" />
      
      {columns.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-muted-foreground mb-4">No hay etapas disponibles para esta marca</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Selecciona una marca diferente o crea nuevas oportunidades 
          </p>
          <Button asChild>
            <Link href="/opportunities/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Nueva Oportunidad
            </Link>
          </Button>
        </div>
      ) : opportunitiesData && opportunitiesData.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-muted-foreground mb-4">No hay oportunidades disponibles</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Crea una nueva oportunidad para empezar a gestionar tu pipeline de ventas
          </p>
          <Button asChild>
            <Link href="/opportunities/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Primera Oportunidad
            </Link>
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-flow-col auto-cols-[300px] gap-4 overflow-x-auto pb-4">
            {columns.map(column => (
              <div key={column.id} className="bg-background p-4 rounded-md border h-fit">
                <h3 className="font-semibold mb-4 text-center">{column.title}</h3>
                
                <Droppable droppableId={column.id} key={column.id}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[200px]"
                    >
                      {Array.isArray(column.opportunities) && column.opportunities.length === 0 ? (
                        <div className="flex items-center justify-center h-[100px] border border-dashed rounded-md p-4">
                          <p className="text-xs text-muted-foreground text-center">
                            Arrastra oportunidades aquí
                          </p>
                        </div>
                      ) : (
                        column.opportunities.map((opportunity, index) => (
                          <Draggable 
                            key={opportunity.id} 
                            draggableId={opportunity.id.toString()} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card className="mb-2">
                                  <CardHeader className="p-3 pb-0">
                                    <CardTitle className="text-sm font-semibold">
                                      <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
                                        {opportunity.name}
                                      </Link>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                      {opportunity.customer_name || opportunity.lead_name || 'Sin contacto asignado'}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      <span>{formatCurrency(opportunity.estimatedValue)}</span>
                                      {opportunity.probability && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {opportunity.probability}%
                                        </Badge>
                                      )}
                                    </div>
                                    {opportunity.estimatedCloseDate && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        <span>{new Date(opportunity.estimatedCloseDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </CardContent>
                                  <CardFooter className="p-3 pt-0 flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      <span>{opportunity.assigned_user_name || 'Sin asignar'}</span>
                                    </div>
                                    <Badge variant={opportunity.brand === 'bride' ? 'secondary' : 'default'} className="text-xs">
                                      {opportunity.brand === 'bride' ? 'Bride' : 'Sleepwear'}
                                    </Badge>
                                  </CardFooter>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}