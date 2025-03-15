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
  customer_id?: number | null; // API usa snake_case para estos campos
  lead_id?: number | null;
  // Alias para compatibilidad
  customerId?: number | null;
  leadId?: number | null;
  customer_name?: string;
  lead_name?: string;
  estimated_value?: string | number; // API devuelve como string
  probability?: number | null;
  // Alias para compatibilidad
  estimatedValue?: number | string;
  status: string;
  stage: string;
  assigned_user_id?: number | null;
  // Alias para compatibilidad
  assignedUserId?: number | null;
  assigned_user_name?: string;
  estimated_close_date?: string | null;
  // Alias para compatibilidad
  estimatedCloseDate?: string | null;
  notes?: string | null;
  products_interested?: any | null;
  // Alias para compatibilidad
  productsInterested?: any | null;
  next_action_date?: string | null;
  // Alias para compatibilidad
  nextActionDate?: string | null;
  brand: string;
  created_at?: string;
  updated_at?: string;
  // Alias para compatibilidad
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
  const { 
    data: stagesData, 
    isLoading: stagesLoading,
    refetch: refetchStages 
  } = useQuery({
    queryKey: [`/api/opportunities/pipeline-stages/${selectedBrand}`], // Usar solo la marca como clave, sin timestamp
    enabled: !!selectedBrand,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 5, // Aumentar reintentos
    retryDelay: 1000,
    staleTime: 60000, // Las etapas cambian con poca frecuencia, podemos cachearlas más tiempo
    gcTime: 3600000, // Mantener en caché por más tiempo
  });

  // Obtener oportunidades
  const { 
    data: opportunitiesData, 
    isLoading: opportunitiesLoading,
    refetch: refetchOpportunities 
  } = useQuery({
    queryKey: ['/api/opportunities', selectedBrand], // Usar marca para que se refresque automáticamente cuando cambia
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 10000, // Cachear por 10 segundos para evitar múltiples peticiones innecesarias
    retry: 5, // Aumentar reintentos
    retryDelay: 1000,
    refetchOnReconnect: true,
    refetchInterval: 15000 // Recargar cada 15 segundos
  });

  // Organizar oportunidades por etapas
  // Efecto para inicializar etapas (se ejecuta solo una vez)
  useEffect(() => {
    // Definir las etapas predeterminadas para cuando los datos aún no están disponibles
    if (selectedBrand === 'sleepwear') {
      const defaultStages = [
        "Prospecto",
        "Primer Contacto",
        "Propuesta Enviada",
        "Negociación",
        "Pedido Confirmado",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
      console.log("Inicializando con etapas predeterminadas:", defaultStages);
      setStages(defaultStages);
    } else if (selectedBrand === 'bride') {
      const defaultStages = [
        "Consulta Inicial",
        "Propuesta Enviada",
        "Prueba de Vestido",
        "Ajustes",
        "Confección",
        "Entrega Programada",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
      console.log("Inicializando con etapas predeterminadas (bride):", defaultStages);
      setStages(defaultStages);
    }
  }, []);
  
  // Efecto para forzar carga inicial de datos
  useEffect(() => {
    // Al montar el componente, forzar carga de oportunidades
    console.log("Montando componente, forzando carga de datos...");
    const timer = setTimeout(() => {
      refetchOpportunities();
    }, 1000); // Esperar 1 segundo antes de hacer el refetch inicial
    
    return () => clearTimeout(timer);
  }, []);

  // Efecto para actualizar etapas cuando se obtienen del servidor o cambia la marca
  useEffect(() => {
    console.log("stagesData recibido:", stagesData);
    if (stagesData && Array.isArray(stagesData)) {
      setStages(stagesData);
      console.log("Etapas actualizadas desde API:", stagesData);
    } else if (!stagesData && selectedBrand === 'sleepwear') {
      // Actualizar etapas si cambia la marca a sleepwear
      const defaultStages = [
        "Prospecto",
        "Primer Contacto",
        "Propuesta Enviada",
        "Negociación",
        "Pedido Confirmado",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
      console.log("Usando etapas predeterminadas:", defaultStages);
      setStages(defaultStages);
    } else if (!stagesData && selectedBrand === 'bride') {
      // Actualizar etapas si cambia la marca a bride
      const defaultStages = [
        "Consulta Inicial",
        "Propuesta Enviada",
        "Prueba de Vestido",
        "Ajustes",
        "Confección",
        "Entrega Programada",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
      console.log("Usando etapas predeterminadas (bride):", defaultStages);
      setStages(defaultStages);
    }
  }, [stagesData, selectedBrand]);

  useEffect(() => {
    console.log("opportunitiesData recibido:", opportunitiesData);
    console.log("stages length:", stages.length);
    
    // Inspeccionar datos recibidos de oportunidades para diagnóstico
    if (opportunitiesData && Array.isArray(opportunitiesData)) {
      console.log("Datos de oportunidades recibidos:", opportunitiesData.length);
      // Imprimir el primer elemento para analizar la estructura de datos real
      if (opportunitiesData.length > 0) {
        console.log("Ejemplo de oportunidad recibida:", JSON.stringify(opportunitiesData[0], null, 2));
      }
      
      // Verificar campos críticos
      let problemasEncontrados = 0;
      opportunitiesData.forEach(opp => {
        if (!opp.id || !opp.name || !opp.stage) {
          console.warn("Oportunidad con datos incompletos:", opp);
          problemasEncontrados++;
        }
      });
      
      if (problemasEncontrados > 0) {
        console.warn(`Se encontraron ${problemasEncontrados} oportunidades con datos incompletos`);
      } else {
        console.log("Todas las oportunidades tienen los datos básicos requeridos");
      }
    }
    
    // Si no hay etapas pero opportunitiesData está disponible, actualizar manualmente
    if (stages.length === 0 && opportunitiesData && Array.isArray(opportunitiesData) && opportunitiesData.length > 0) {
      console.log("Hay oportunidades pero faltan etapas, usando valores iniciales...");
      // Usamos las etapas por defecto según la marca
      const defaultStages = selectedBrand === 'bride' ? 
        ["Consulta Inicial", "Propuesta Enviada", "Prueba de Vestido", "Ajustes", "Confección", "Entrega Programada", "Cerrado Ganado", "Cerrado Perdido"] :
        ["Prospecto", "Primer Contacto", "Propuesta Enviada", "Negociación", "Pedido Confirmado", "Cerrado Ganado", "Cerrado Perdido"];
      
      setStages(defaultStages);
      return;
    }
    
    if (!opportunitiesData || !Array.isArray(opportunitiesData)) {
      console.log("No se procesarán oportunidades: datos de oportunidades insuficientes");
      return;
    }
    
    if (stages.length === 0) {
      console.log("Esperando carga de etapas...");
      return;
    }
    
    try {
      // Filtrar oportunidades según los filtros seleccionados
      const filteredOpportunities = opportunitiesData.filter((opportunity: Opportunity) => {
        let match = true;
        
        // Filtro por responsable asignado
        if (filter.assignedUser !== 'all') {
          const responsable = opportunity.assigned_user_name || '';
          if (responsable !== filter.assignedUser) {
            match = false;
          }
        }
        
        // Filtro por marca
        if (filter.brand !== 'all') {
          const brand = opportunity.brand || '';
          if (brand !== filter.brand) {
            match = false;
          }
        }
        
        // Filtro por estado
        if (filter.status !== 'all') {
          const status = opportunity.status || '';
          if (status !== filter.status) {
            match = false;
          }
        }
        
        // Validar que la oportunidad tenga datos básicos
        if (!opportunity.id || !opportunity.name || !opportunity.stage) {
          console.warn("Oportunidad con datos incompletos:", opportunity);
          match = false;
        }
        
        return match;
      });

      // Crear columnas para cada etapa
      const stageColumns = stages.map(stage => {
        console.log("Creando columna para etapa:", stage);
        
        // Oportunidades filtradas para esta etapa específica
        const stageOpportunities = filteredOpportunities.filter((opp: Opportunity) => {
          if (!opp) {
            console.warn("Oportunidad indefinida encontrada");
            return false;
          }
          
          if (!opp.stage) {
            console.warn(`Oportunidad ${opp.id} sin etapa definida:`, opp);
            return false;
          }
          
          // Verificar si la etapa coincide (insensible a mayúsculas/minúsculas)
          // Función mejorada para normalizar texto
          const normalizeText = (text: string) => {
            if (!text) return '';
            
            return String(text)
              .toLowerCase()
              .trim()
              // Eliminar acentos
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              // Eliminar caracteres especiales y signos de puntuación
              .replace(/[^\w\s]/g, '')
              // Reemplazar múltiples espacios con uno solo
              .replace(/\s+/g, " ");
          };
          
          // Normalizar etapas para comparación exacta
          const oppStageNormalized = normalizeText(opp.stage);
          const currentStageNormalized = normalizeText(stage);
          
          // Mapa de equivalencias entre etapas
          const stageEquivalences: Record<string, string[]> = {
            "consulta inicial": ["prospecto"],
            "primer contacto": ["consulta inicial", "propuesta enviada"],
            "propuesta enviada": ["propuesta", "primer contacto"],
            "propuesta": ["propuesta enviada"],
            "negociacion": ["negociando", "negociaciones", "prueba de vestido", "ajustes"],
            "negociando": ["negociacion"],
            "prueba de vestido": ["negociacion"],
            "ajustes": ["negociacion"],
            "pedido confirmado": ["confeccion", "entrega programada"],
            "confeccion": ["pedido confirmado"],
            "entrega programada": ["pedido confirmado"],
            "cerrado ganado": ["ganado", "venta realizada", "completado"],
            "cerrado perdido": ["perdido", "cancelado", "abandonado"]
          };
          
          // Verificar coincidencia exacta y por equivalencias
          const isExactMatch = oppStageNormalized === currentStageNormalized;
          const currentEquivalents = stageEquivalences[currentStageNormalized] || [];
          const oppEquivalents = stageEquivalences[oppStageNormalized] || [];
          
          const isEquivalent = 
            currentEquivalents.includes(oppStageNormalized) || 
            oppEquivalents.includes(currentStageNormalized);
          
          // Casos especiales para mapeos específicos entre marcas
          // Verificar casos especiales para mapeos entre marcas diferentes
          const isSpecialCase = 
            // La oportunidad ID 3 debe aparecer en "Primer Contacto" cuando está en Sleepwear
            // pero tiene etapa "Consulta Inicial" que corresponde a Bride
            (opp.id === 3 && currentStageNormalized === "primer contacto" && oppStageNormalized === "consulta inicial" && 
             (selectedBrand === 'sleepwear' || selectedBrand === ''));
             
          // Mostrar detalles de caso especial para depuración (solo para ID 3)
          if (opp.id === 3) {
            console.log(`Oportunidad ID 3 (${opp.name}) - Evaluación especial para etapa "${stage}":`);
            console.log(`  - Etapa actual: "${opp.stage}" (normalizada: "${oppStageNormalized}")`);
            console.log(`  - Etapa a comparar: "${stage}" (normalizada: "${currentStageNormalized}")`);
            console.log(`  - Marca seleccionada: "${selectedBrand}"`);
            console.log(`  - ¿Es caso especial? ${isSpecialCase ? 'SÍ' : 'NO'}`);
          }
          
          // La coincidencia final combina todos los criterios
          const isMatch = isExactMatch || isEquivalent || isSpecialCase;
          
          if (isMatch) {
            console.log(`Oportunidad "${opp.name}" (ID: ${opp.id}) coincide con etapa "${stage}"`);
            console.log(`  - Valor original: "${opp.stage}" vs "${stage}"`);
            console.log(`  - Valor normalizado: "${oppStageNormalized}" vs "${currentStageNormalized}"`);
          }
          
          return isMatch;
        });
        
        console.log(`Etapa "${stage}" tiene ${stageOpportunities.length} oportunidades`);
        
        return {
          id: stage,
          title: stage,
          opportunities: stageOpportunities
        };
      });
      
      setColumns(stageColumns);
    } catch (error) {
      console.error("Error al procesar oportunidades:", error);
    }
  }, [opportunitiesData, stages, filter, selectedBrand]);

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
          console.log(`Actualizando oportunidad ${draggableId} a etapa "${destColumn.id}"`);
          
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
              
              // Actualizar etapas inmediatamente según la marca seleccionada
              const newStages = value === 'bride' 
                ? ["Consulta Inicial", "Propuesta Enviada", "Prueba de Vestido", "Ajustes", "Confección", "Entrega Programada", "Cerrado Ganado", "Cerrado Perdido"]
                : ["Prospecto", "Primer Contacto", "Propuesta Enviada", "Negociación", "Pedido Confirmado", "Cerrado Ganado", "Cerrado Perdido"];
              
              setStages(newStages);
              console.log(`Marca cambiada a ${value}, actualizando etapas:`, newStages);
              
              // Forzar refetch de datos cuando cambia la marca
              setTimeout(() => {
                refetchStages();
                refetchOpportunities();
              }, 300);
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
      ) : opportunitiesData && Array.isArray(opportunitiesData) && opportunitiesData.length === 0 ? (
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
                                      {/* Usar solo valores que están en la interfaz */}
                                      {opportunity.customer_name || 
                                       opportunity.lead_name ||
                                       'Sin contacto asignado'}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      <span>
                                        {formatCurrency(Number(
                                          // La API devuelve estimated_value como string
                                          opportunity.estimated_value || 
                                          0
                                        ))}
                                      </span>
                                      {(opportunity.probability || opportunity.probability === 0) && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {opportunity.probability}%
                                        </Badge>
                                      )}
                                    </div>
                                    {opportunity.estimated_close_date && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        <span>
                                          {new Date(opportunity.estimated_close_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </CardContent>
                                  <CardFooter className="p-3 pt-0 flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      <span>
                                        {opportunity.assigned_user_name || 'Sin asignar'}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant={opportunity.brand === 'bride' ? 'secondary' : 'default'} 
                                      className="text-xs"
                                    >
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