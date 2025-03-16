import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Filter, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ActivityType, 
  ActivityStatus, 
  ActivityPriority, 
  ACTIVITY_TYPE_LABELS, 
  ACTIVITY_STATUS_LABELS, 
  ACTIVITY_PRIORITY_LABELS,
  ActivityFilter
} from './types';
import { useQuery } from '@tanstack/react-query';

interface ActivityFiltersComponentProps {
  filters: ActivityFilter;
  onFilterChange: (filters: ActivityFilter) => void;
}

export function ActivityFiltersComponent({ 
  filters,
  onFilterChange 
}: ActivityFiltersComponentProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempFilters, setTempFilters] = React.useState<ActivityFilter>(filters);
  
  // Resetear estado temporal cuando cambian los filtros externos
  React.useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Obtener usuarios para el selector de asignados
  const { data: users = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/users'],
  });

  // Obtener clientes y leads para los selectores de relaciones
  const { data: customers = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/customers'],
  });

  const { data: leads = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/leads'],
  });

  const { data: opportunities = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/opportunities'],
  });

  // Actualizar filtros y cerrar el popover
  const applyFilters = () => {
    onFilterChange(tempFilters);
    setIsOpen(false);
  };

  // Restablecer filtros a valores iniciales
  const resetFilters = () => {
    const emptyFilters: ActivityFilter = {
      types: undefined,
      statuses: undefined,
      priorities: undefined,
      startDate: undefined,
      endDate: undefined,
      search: '',
      assignedUserId: undefined,
      relatedToCustomerId: undefined,
      relatedToLeadId: undefined,
      relatedToOpportunityId: undefined,
    };
    setTempFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setIsOpen(false);
  };

  // Manejar cambio en tipos seleccionados
  const handleTypeChange = (type: ActivityType) => {
    setTempFilters(prev => {
      const currentTypes = prev.types || [];
      if (currentTypes.includes(type)) {
        return {
          ...prev,
          types: currentTypes.filter(t => t !== type)
        };
      } else {
        return {
          ...prev,
          types: [...currentTypes, type]
        };
      }
    });
  };

  // Manejar cambio en estados seleccionados
  const handleStatusChange = (status: ActivityStatus) => {
    setTempFilters(prev => {
      const currentStatuses = prev.statuses || [];
      if (currentStatuses.includes(status)) {
        return {
          ...prev,
          statuses: currentStatuses.filter(s => s !== status)
        };
      } else {
        return {
          ...prev,
          statuses: [...currentStatuses, status]
        };
      }
    });
  };

  // Manejar cambio en prioridades seleccionadas
  const handlePriorityChange = (priority: ActivityPriority) => {
    setTempFilters(prev => {
      const currentPriorities = prev.priorities || [];
      if (currentPriorities.includes(priority)) {
        return {
          ...prev,
          priorities: currentPriorities.filter(p => p !== priority)
        };
      } else {
        return {
          ...prev,
          priorities: [...currentPriorities, priority]
        };
      }
    });
  };

  // Contar filtros activos
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (tempFilters.types && tempFilters.types.length > 0) count++;
    if (tempFilters.statuses && tempFilters.statuses.length > 0) count++;
    if (tempFilters.priorities && tempFilters.priorities.length > 0) count++;
    if (tempFilters.startDate) count++;
    if (tempFilters.endDate) count++;
    if (tempFilters.search && tempFilters.search.trim().length > 0) count++;
    if (tempFilters.assignedUserId) count++;
    if (tempFilters.relatedToCustomerId || tempFilters.relatedToLeadId || tempFilters.relatedToOpportunityId) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1">
        <Input
          placeholder="Buscar actividades..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="w-full"
        />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros de actividades</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-8 px-2 text-xs"
              >
                Restablecer
              </Button>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="types">
                <AccordionTrigger className="py-2">Tipos</AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2">
                  {Object.entries(ActivityType).map(([key, value]) => (
                    <div key={value} className="flex items-center gap-2">
                      <Button
                        variant={tempFilters.types?.includes(value) ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTypeChange(value)}
                      >
                        {tempFilters.types?.includes(value) && (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {ACTIVITY_TYPE_LABELS[value]}
                      </Button>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="statuses">
                <AccordionTrigger className="py-2">Estados</AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2">
                  {Object.entries(ActivityStatus).map(([key, value]) => (
                    <div key={value} className="flex items-center gap-2">
                      <Button
                        variant={tempFilters.statuses?.includes(value) ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleStatusChange(value)}
                      >
                        {tempFilters.statuses?.includes(value) && (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {ACTIVITY_STATUS_LABELS[value]}
                      </Button>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="priorities">
                <AccordionTrigger className="py-2">Prioridades</AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2">
                  {Object.entries(ActivityPriority).map(([key, value]) => (
                    <div key={value} className="flex items-center gap-2">
                      <Button
                        variant={tempFilters.priorities?.includes(value) ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handlePriorityChange(value)}
                      >
                        {tempFilters.priorities?.includes(value) && (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {ACTIVITY_PRIORITY_LABELS[value]}
                      </Button>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="dates">
                <AccordionTrigger className="py-2">Fechas</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="startDate">Desde</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !tempFilters.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tempFilters.startDate ? (
                            format(new Date(tempFilters.startDate), "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          {tempFilters.startDate && (
                            <X 
                              className="ml-auto h-4 w-4 opacity-70 hover:opacity-100" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempFilters(prev => ({ ...prev, startDate: undefined }));
                              }}
                            />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tempFilters.startDate ? new Date(tempFilters.startDate) : undefined}
                          onSelect={(date) => {
                            setTempFilters(prev => ({ 
                              ...prev, 
                              startDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                            }));
                          }}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="endDate">Hasta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="endDate"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !tempFilters.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tempFilters.endDate ? (
                            format(new Date(tempFilters.endDate), "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          {tempFilters.endDate && (
                            <X 
                              className="ml-auto h-4 w-4 opacity-70 hover:opacity-100" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempFilters(prev => ({ ...prev, endDate: undefined }));
                              }}
                            />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tempFilters.endDate ? new Date(tempFilters.endDate) : undefined}
                          onSelect={(date) => {
                            setTempFilters(prev => ({ 
                              ...prev, 
                              endDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                            }));
                          }}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="assign">
                <AccordionTrigger className="py-2">Asignado a</AccordionTrigger>
                <AccordionContent className="pt-2">
                  <Select
                    value={tempFilters.assignedUserId?.toString() || ""}
                    onValueChange={(value) => {
                      setTempFilters(prev => ({ 
                        ...prev, 
                        assignedUserId: value ? parseInt(value) : undefined 
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="related">
                <AccordionTrigger className="py-2">Relacionado con</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="customer">Cliente</Label>
                    <Select
                      value={tempFilters.relatedToCustomerId?.toString() || ""}
                      onValueChange={(value) => {
                        setTempFilters(prev => ({ 
                          ...prev, 
                          relatedToCustomerId: value ? parseInt(value) : undefined 
                        }));
                      }}
                    >
                      <SelectTrigger id="customer" className="w-full">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="lead">Prospecto</Label>
                    <Select
                      value={tempFilters.relatedToLeadId?.toString() || ""}
                      onValueChange={(value) => {
                        setTempFilters(prev => ({ 
                          ...prev, 
                          relatedToLeadId: value ? parseInt(value) : undefined 
                        }));
                      }}
                    >
                      <SelectTrigger id="lead" className="w-full">
                        <SelectValue placeholder="Seleccionar prospecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="opportunity">Oportunidad</Label>
                    <Select
                      value={tempFilters.relatedToOpportunityId?.toString() || ""}
                      onValueChange={(value) => {
                        setTempFilters(prev => ({ 
                          ...prev, 
                          relatedToOpportunityId: value ? parseInt(value) : undefined 
                        }));
                      }}
                    >
                      <SelectTrigger id="opportunity" className="w-full">
                        <SelectValue placeholder="Seleccionar oportunidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguna</SelectItem>
                        {opportunities.map((opportunity) => (
                          <SelectItem key={opportunity.id} value={opportunity.id.toString()}>
                            {opportunity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={applyFilters}>
                Aplicar filtros
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}