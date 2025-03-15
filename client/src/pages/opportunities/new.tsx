import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, PlusCircle, UserPlus, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeadForm } from '@/components/crm/LeadForm';
import { CustomerForm } from '@/components/crm/CustomerForm';
import { EntitySearchSelect } from '@/components/crm/EntitySearchSelect';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Esquema de validación para la creación de oportunidades
const opportunitySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  estimatedValue: z.coerce.number().min(0, "El valor debe ser positivo"),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  status: z.string().default("negotiation"),
  stage: z.string().min(1, "La etapa es obligatoria"),
  assignedUserId: z.string().optional(),
  estimatedCloseDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  productsInterested: z.array(z.any()).optional(),
  nextActionDate: z.date().optional().nullable(),
  brand: z.string().default("sleepwear"),
})
// Validación adicional para asegurarnos que se selecciona al menos cliente o lead
.refine(data => data.customerId || data.leadId, {
  message: "Debes seleccionar un cliente o un lead para crear la oportunidad",
  path: ['customerId'], // Este error se mostrará en el campo customerId
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function OpportunitiesNew() {
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('customer');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  // Configurar el formulario con valores iniciales
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: "",
      customerId: undefined,
      leadId: undefined,
      estimatedValue: 0,
      probability: 50,
      status: "negotiation",
      stage: "Prospecto", // Valor predeterminado hasta que carguemos las etapas
      brand: "sleepwear",
      notes: "",
      estimatedCloseDate: null,
      nextActionDate: null,
      productsInterested: [],
    },
  });

  // Consultas de datos
  const { data: pipelineStagesSleepwear = [], isLoading: isLoadingSleepwearStages } = useQuery<string[]>({
    queryKey: ['/api/opportunities/pipeline-stages/sleepwear'],
    staleTime: 60000, // 1 minuto
    retry: 3
  });
  
  const { data: pipelineStagesBride = [], isLoading: isLoadingBrideStages } = useQuery<string[]>({
    queryKey: ['/api/opportunities/pipeline-stages/bride'],
    staleTime: 60000, // 1 minuto
    retry: 3
  });
  
  // Efecto para actualizar la etapa cuando se cargan las etapas por primera vez
  useEffect(() => {
    const brand = form.getValues('brand');
    if (brand === 'sleepwear' && Array.isArray(pipelineStagesSleepwear) && pipelineStagesSleepwear.length > 0) {
      console.log("Etapas Sleepwear cargadas:", pipelineStagesSleepwear);
      form.setValue('stage', pipelineStagesSleepwear[0]);
    } else if (brand === 'bride' && Array.isArray(pipelineStagesBride) && pipelineStagesBride.length > 0) {
      console.log("Etapas Bride cargadas:", pipelineStagesBride);
      form.setValue('stage', pipelineStagesBride[0]);
    }
  }, [pipelineStagesSleepwear, pipelineStagesBride, form]);

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    refetchInterval: 3000, // Refrescar datos cada 3 segundos
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (Array.isArray(customers) && customers.length > 0) {
      console.log('Customers data received:', customers);
    }
  }, [customers]);

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<any[]>({
    queryKey: ['/api/leads'],
    refetchInterval: 3000, // Refrescar datos cada 3 segundos
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (Array.isArray(leads) && leads.length > 0) {
      console.log('Leads data received:', leads);
    }
  }, [leads]);
  
  // Forzar refresco de datos al montar el componente
  useEffect(() => {
    // Refrescar listas de clientes y leads al cargar
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
    
    console.log('Forzando refresco de datos de clientes y leads');
  }, []);

  // Mutación para crear oportunidad
  const createOpportunity = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      console.log("Datos del formulario a enviar:", data);
      
      // Verificar que al menos hay un cliente o un lead
      if (!data.customerId && !data.leadId) {
        throw new Error('Debes seleccionar un cliente o un lead para crear la oportunidad');
      }
      
      const processedData = {
        ...data,
        customerId: data.customerId ? parseInt(data.customerId) : null,
        leadId: data.leadId ? parseInt(data.leadId) : null,
        assignedUserId: data.assignedUserId ? parseInt(data.assignedUserId) : null,
        estimatedCloseDate: data.estimatedCloseDate ? data.estimatedCloseDate.toISOString() : null,
        nextActionDate: data.nextActionDate ? data.nextActionDate.toISOString() : null,
      };
      
      console.log("Datos procesados a enviar:", processedData);
      
      try {
        const response = await fetch('/api/opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error al crear oportunidad:", errorData);
          throw new Error(errorData.error || 'Error al crear la oportunidad');
        }
        
        const responseData = await response.json();
        console.log("Respuesta exitosa:", responseData);
        return responseData;
      } catch (error) {
        console.error("Error en la petición:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Oportunidad creada",
        description: "La oportunidad se ha creado correctamente",
      });
      
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      
      // Navegar de vuelta al pipeline
      navigate('/opportunities');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar el valor de stage cuando cambia la marca
  useEffect(() => {
    const brand = form.getValues('brand');
    const stages = brand === 'bride' ? pipelineStagesBride : pipelineStagesSleepwear;
    
    if (Array.isArray(stages) && stages.length > 0) {
      form.setValue('stage', stages[0]);
    }
  }, [form.watch('brand'), pipelineStagesSleepwear, pipelineStagesBride, form]);
  
  // Efecto para manejar cambio de tabs, asegurando limpieza del otro campo
  useEffect(() => {
    if (activeTab === 'customer' && form.getValues('leadId')) {
      // Si cambiamos a la pestaña de clientes y ya hay un lead seleccionado
      console.log('Cambiando a pestaña Cliente, limpiando leadId:', form.getValues('leadId'));
      form.setValue('leadId', undefined);
    } else if (activeTab === 'lead' && form.getValues('customerId')) {
      // Si cambiamos a la pestaña de leads y ya hay un cliente seleccionado
      console.log('Cambiando a pestaña Lead, limpiando customerId:', form.getValues('customerId'));
      form.setValue('customerId', undefined);
    }
  }, [activeTab, form]);

  // Manejar el envío del formulario
  const onSubmit = (data: OpportunityFormValues) => {
    createOpportunity.mutate(data);
  };

  // Filtrar leads que no han sido convertidos
  const activeLeads = Array.isArray(leads) 
    ? leads.filter((lead: any) => !lead.convertedToCustomer) 
    : [];

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/opportunities')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Nueva Oportunidad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Oportunidad</CardTitle>
          <CardDescription>
            Crea una nueva oportunidad de venta para hacer seguimiento en el pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="customer">Cliente</TabsTrigger>
                  <TabsTrigger value="lead">Lead</TabsTrigger>
                </TabsList>
                
                <TabsContent value="customer" className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Cliente</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-8"
                      onClick={() => setCustomerDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Nuevo Cliente
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <EntitySearchSelect
                          value={field.value}
                          onValueChange={(value) => {
                            console.log("Cliente seleccionado:", value);
                            field.onChange(value);
                            // Si se selecciona un cliente, limpiar el lead
                            if (value) {
                              form.setValue('leadId', undefined);
                            }
                          }}
                          apiEndpoint="/api/customers"
                          placeholder="Selecciona un cliente"
                          entityName="Clientes"
                          emptyMessage="No se encontraron clientes. Crea uno nuevo."
                        />
                        <FormDescription>
                          Selecciona el cliente relacionado con esta oportunidad o crea uno nuevo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="lead" className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Lead</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-8"
                      onClick={() => setLeadDialogOpen(true)}
                    >
                      <UserCircle className="h-4 w-4 mr-1" />
                      Nuevo Lead
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem>
                        <EntitySearchSelect
                          value={field.value}
                          onValueChange={(value) => {
                            console.log("Lead seleccionado:", value);
                            field.onChange(value);
                            // Si se selecciona un lead, limpiar el cliente
                            if (value) {
                              form.setValue('customerId', undefined);
                            }
                          }}
                          apiEndpoint="/api/leads"
                          placeholder="Selecciona un lead"
                          entityName="Leads"
                          emptyMessage="No se encontraron leads. Crea uno nuevo."
                          filter={(lead) => !lead.convertedToCustomer}
                        />
                        <FormDescription>
                          Selecciona el lead relacionado con esta oportunidad o crea uno nuevo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Oportunidad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Proyecto vestido de novia para María" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una marca" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sleepwear">Civetta Sleepwear</SelectItem>
                          <SelectItem value="bride">Civetta Bride</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Estimado</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidad (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingSleepwearStages || isLoadingBrideStages}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingSleepwearStages || isLoadingBrideStages ? "Cargando..." : "Selecciona una etapa"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSleepwearStages || isLoadingBrideStages ? (
                            <SelectItem value="loading" disabled>Cargando etapas...</SelectItem>
                          ) : form.watch('brand') === 'bride' ? (
                            Array.isArray(pipelineStagesBride) && pipelineStagesBride.length > 0 ? (
                              pipelineStagesBride.map((stage: string) => (
                                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-data" disabled>No hay etapas configuradas</SelectItem>
                            )
                          ) : (
                            Array.isArray(pipelineStagesSleepwear) && pipelineStagesSleepwear.length > 0 ? (
                              pipelineStagesSleepwear.map((stage: string) => (
                                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-data" disabled>No hay etapas configuradas</SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="negotiation">En Negociación</SelectItem>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="closed_won">Cerrada Ganada</SelectItem>
                          <SelectItem value="closed_lost">Cerrada Perdida</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimatedCloseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Estimada de Cierre</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nextActionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Próxima Acción</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalles adicionales sobre esta oportunidad..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/opportunities')}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOpportunity.isPending}
                >
                  {createOpportunity.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Oportunidad
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dialog para crear un nuevo cliente */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>Registre un nuevo cliente en el sistema</DialogDescription>
          </DialogHeader>
          <CustomerForm
            onComplete={(customer: any) => {
              setCustomerDialogOpen(false);
              
              // Refrescar la lista de clientes
              queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
              
              // Seleccionar automáticamente el cliente recién creado en el formulario
              if (customer?.id) {
                form.setValue('customerId', customer.id.toString());
                form.setValue('leadId', undefined);
              }
              
              toast({
                title: "Cliente creado",
                description: "El cliente ha sido creado exitosamente",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para crear un nuevo lead */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Lead</DialogTitle>
            <DialogDescription>Registre un nuevo prospecto en el sistema</DialogDescription>
          </DialogHeader>
          <LeadForm
            onClose={() => {
              setLeadDialogOpen(false);
              
              // Refrescar la lista de leads
              queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
              
              // Buscar el lead recién creado (el último en la lista)
              setTimeout(() => {
                const newLeads = queryClient.getQueryData<any[]>(['/api/leads']) || [];
                if (newLeads.length > 0) {
                  const latestLead = newLeads[newLeads.length - 1];
                  if (latestLead?.id) {
                    form.setValue('leadId', latestLead.id.toString());
                    form.setValue('customerId', undefined);
                  }
                }
              }, 500);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}