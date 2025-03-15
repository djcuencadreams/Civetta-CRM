import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User, 
  Percent, 
  Briefcase,
  MessageSquare,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function OpportunityDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  
  // Obtener detalles de la oportunidad
  const { 
    data: opportunity, 
    isLoading, 
    isError, 
    error
  } = useQuery({
    queryKey: ['/api/opportunities', id],
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Manejar el estado de carga
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Skeleton className="h-8 w-72 ml-2" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Manejar errores
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Error al cargar la oportunidad</h1>
        </div>
        
        <div className="p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            <AlertTriangle className="h-5 w-5 inline-block mr-2" />
            No se pudo cargar la información
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            Hubo un problema al intentar obtener los detalles de esta oportunidad.
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            {error instanceof Error ? error.message : 'Error de conexión'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  // Determinar la clase de color según la etapa
  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    const normalizedStage = stage.toLowerCase();
    
    if (normalizedStage.includes('cerrado ganado') || normalizedStage.includes('pedido confirmado')) {
      return "default"; // verde por defecto
    }
    
    if (normalizedStage.includes('cerrado perdido')) {
      return "destructive"; // rojo
    }
    
    if (normalizedStage.includes('negociación') || normalizedStage.includes('propuesta')) {
      return "secondary"; // morado
    }
    
    return "outline"; // neutral para las demás etapas
  };

  // Renderizar el contenido principal
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">{opportunity?.name || 'Detalles de oportunidad'}</h1>
        <Badge variant={getStageBadgeVariant(opportunity?.stage || '')}>
          {opportunity?.stage}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Detalles de la oportunidad de venta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cliente/Lead</p>
                  <p className="text-sm">
                    {opportunity?.customer_name || opportunity?.lead_name || 'Sin asignar'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                  <p className="text-sm flex items-center">
                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {opportunity?.assigned_user_name || 'Sin asignar'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Valor estimado</p>
                  <p className="text-sm flex items-center">
                    <DollarSign className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {formatCurrency(opportunity?.estimated_value || 0)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Probabilidad</p>
                  <p className="text-sm flex items-center">
                    <Percent className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {opportunity?.probability || 0}%
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Fecha de cierre estimada</p>
                  <p className="text-sm flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {opportunity?.estimated_close_date ? 
                      formatDate(new Date(opportunity.estimated_close_date)) : 
                      'No especificada'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Marca</p>
                  <p className="text-sm flex items-center">
                    <Briefcase className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {opportunity?.brand || 'No especificada'}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-line">{opportunity?.notes || 'Sin notas adicionales'}</p>
              </div>
              
              {opportunity?.products_interested && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Productos de interés</p>
                    <p className="text-sm whitespace-pre-line">
                      {typeof opportunity.products_interested === 'string' 
                        ? opportunity.products_interested
                        : JSON.stringify(opportunity.products_interested, null, 2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/opportunities/${id}/edit`}>
                  Editar
                </Link>
              </Button>
              
              <Button variant="default" asChild>
                <Link href={`/opportunities/convert/${id}`}>
                  Convertir a Pedido
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Tabs defaultValue="interactions" className="mt-6">
            <TabsList>
              <TabsTrigger value="interactions">
                <MessageSquare className="h-4 w-4 mr-2" />
                Interacciones
              </TabsTrigger>
              <TabsTrigger value="activities">
                <CheckSquare className="h-4 w-4 mr-2" />
                Actividades
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="interactions">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de interacciones</CardTitle>
                  <CardDescription>
                    Conversaciones y contactos relacionados con esta oportunidad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {opportunity?.interactions && opportunity.interactions.length > 0 ? (
                    <div className="space-y-4">
                      {opportunity.interactions.map((interaction: any) => (
                        <div key={interaction.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{interaction.type}</h4>
                            <Badge variant="outline">{interaction.channel}</Badge>
                          </div>
                          <p className="text-sm mt-1">{interaction.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(new Date(interaction.created_at))}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No hay interacciones registradas para esta oportunidad
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/opportunities/${id}/interactions/new`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Registrar interacción
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle>Actividades programadas</CardTitle>
                  <CardDescription>
                    Tareas y seguimientos planificados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {opportunity?.activities && opportunity.activities.length > 0 ? (
                    <div className="space-y-4">
                      {opportunity.activities.map((activity: any) => (
                        <div key={activity.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge variant={activity.status === 'Completada' ? 'default' : 'secondary'}>
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{activity.description}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Inicio: {formatDate(new Date(activity.start_time))}</span>
                            {activity.end_time && (
                              <span>Fin: {formatDate(new Date(activity.end_time))}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No hay actividades programadas para esta oportunidad
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/opportunities/${id}/activities/new`}>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Programar actividad
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Panel lateral */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Etapa actual</p>
                  <Badge variant={getStageBadgeVariant(opportunity?.stage || '')}>
                    {opportunity?.stage}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Probabilidad de cierre</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${opportunity?.probability || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-right mt-1">{opportunity?.probability || 0}%</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Próxima acción</p>
                  <p className="text-sm">
                    {opportunity?.next_action_date ? 
                      `${formatDate(new Date(opportunity.next_action_date))}` : 
                      'No programada'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Seguimiento</p>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/opportunities/${id}/update-stage`}>
                        Cambiar etapa
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/opportunities/${id}/interactions/new`}>
                        Registrar interacción
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Creada</p>
                  <p>{formatDate(new Date(opportunity?.created_at || new Date()))}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Última actualización</p>
                  <p>{formatDate(new Date(opportunity?.updated_at || new Date()))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}