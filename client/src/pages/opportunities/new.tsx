import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function OpportunitiesNew() {
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('customer');

  // Consultas de datos
  const { data: pipelineStagesSleepwear = [] } = useQuery<string[]>({
    queryKey: ['/api/opportunities/pipeline-stages/sleepwear'],
  });
  
  const { data: pipelineStagesBride = [] } = useQuery<string[]>({
    queryKey: ['/api/opportunities/pipeline-stages/bride'],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/leads'],
  });

  // Mutación para crear oportunidad
  const createOpportunity = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      const processedData = {
        ...data,
        customerId: data.customerId ? parseInt(data.customerId) : null,
        leadId: data.leadId ? parseInt(data.leadId) : null,
        assignedUserId: data.assignedUserId ? parseInt(data.assignedUserId) : null,
        estimatedCloseDate: data.estimatedCloseDate ? data.estimatedCloseDate.toISOString() : null,
        nextActionDate: data.nextActionDate ? data.nextActionDate.toISOString() : null,
      };
      
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la oportunidad');
      }
      
      return await response.json();
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
      stage: pipelineStagesSleepwear && pipelineStagesSleepwear.length > 0 ? pipelineStagesSleepwear[0] : "Prospecto",
      brand: "sleepwear",
      notes: "",
      estimatedCloseDate: null,
      nextActionDate: null,
      productsInterested: [],
    },
  });

  // Actualizar el valor de stage cuando cambia la marca
  useEffect(() => {
    const brand = form.getValues('brand');
    const stages = brand === 'bride' ? pipelineStagesBride : pipelineStagesSleepwear;
    
    if (stages && stages.length > 0) {
      form.setValue('stage', stages[0]);
    }
  }, [form.watch('brand'), pipelineStagesSleepwear, pipelineStagesBride]);

  // Manejar el envío del formulario
  const onSubmit = (data: OpportunityFormValues) => {
    createOpportunity.mutate(data);
  };

  // Filtrar leads que no han sido convertidos
  const activeLeads = leads.filter((lead: any) => !lead.convertedToCustomer);

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
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Si se selecciona un cliente, limpiar el lead
                            if (value) {
                              form.setValue('leadId', undefined);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona el cliente relacionado con esta oportunidad.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="lead" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Si se selecciona un lead, limpiar el cliente
                            if (value) {
                              form.setValue('customerId', undefined);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeLeads.map((lead: any) => (
                              <SelectItem key={lead.id} value={lead.id.toString()}>
                                {lead.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona el lead relacionado con esta oportunidad.
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una etapa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(form.watch('brand') === 'bride' ? pipelineStagesBride : pipelineStagesSleepwear).map((stage: string) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
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
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="negotiation">Negociación</SelectItem>
                          <SelectItem value="closed_won">Cerrado Ganado</SelectItem>
                          <SelectItem value="closed_lost">Cerrado Perdido</SelectItem>
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
                                "w-full pl-3 text-left font-normal",
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
                            selected={field.value || undefined}
                            onSelect={field.onChange}
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
                                "w-full pl-3 text-left font-normal",
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
                            selected={field.value || undefined}
                            onSelect={field.onChange}
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
                        placeholder="Escribe aquí detalles adicionales sobre la oportunidad"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
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
    </div>
  );
}