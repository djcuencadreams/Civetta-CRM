import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '../../lib/queryClient';
import { 
  Activity, 
  ActivityFilter, 
  ActivityType, 
  ActivityStatus,
  ActivityPriority,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_TYPE_COLORS
} from './types';
import { Search, Filter, CalendarIcon, Clock, X } from 'lucide-react';

interface ActivityFiltersProps {
  onFilterChange: (filters: ActivityFilter) => void;
  currentFilters: ActivityFilter;
}

const ActivityFilters = ({ onFilterChange, currentFilters }: ActivityFiltersProps) => {
  // Estado local para los filtros
  const [searchQuery, setSearchQuery] = useState(currentFilters.searchQuery || '');
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>(currentFilters.type || []);
  const [selectedStatuses, setSelectedStatuses] = useState<ActivityStatus[]>(currentFilters.status || []);
  const [selectedPriorities, setSelectedPriorities] = useState<ActivityPriority[]>(currentFilters.priority || []);
  const [assignedUserId, setAssignedUserId] = useState<number | undefined>(currentFilters.assignedUserId);
  const [customerId, setCustomerId] = useState<number | undefined>(currentFilters.customerId);
  const [leadId, setLeadId] = useState<number | undefined>(currentFilters.leadId);
  const [startDate, setStartDate] = useState<Date | undefined>(currentFilters.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(currentFilters.endDate);
  
  // Obtener datos relacionados para los selectores
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users')
  });
  
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: () => apiRequest('/api/customers')
  });
  
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => apiRequest('/api/leads')
  });
  
  // Aplicar filtros cuando cambia el estado local
  useEffect(() => {
    const newFilters: ActivityFilter = {
      ...currentFilters,
      searchQuery: searchQuery || undefined,
      type: selectedTypes.length > 0 ? selectedTypes : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
      assignedUserId,
      customerId,
      leadId,
      startDate,
      endDate
    };
    
    onFilterChange(newFilters);
  }, [
    searchQuery, 
    selectedTypes, 
    selectedStatuses, 
    selectedPriorities,
    assignedUserId,
    customerId,
    leadId,
    startDate,
    endDate
  ]);
  
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setAssignedUserId(undefined);
    setCustomerId(undefined);
    setLeadId(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    
    onFilterChange({});
  };
  
  // Funciones auxiliares para el checkbox de tipos
  const handleTypeToggle = (type: ActivityType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };
  
  // Funciones auxiliares para el checkbox de estados
  const handleStatusToggle = (status: ActivityStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };
  
  // Funciones auxiliares para el checkbox de prioridades
  const handlePriorityToggle = (priority: ActivityPriority) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority) 
        : [...prev, priority]
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-semibold flex items-center">
          <Filter className="h-4 w-4 mr-2" /> Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        {/* Barra de búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar actividades..."
              className="pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Filtros de fecha */}
        <div className="space-y-2">
          <Label>Rango de fechas</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="start-date" className="text-xs">Fecha de inicio</Label>
              <DatePicker
                value={startDate}
                onChange={(date) => setStartDate(date as Date | undefined)}
                placeholder="Fecha inicio"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date" className="text-xs">Fecha de fin</Label>
              <DatePicker
                value={endDate}
                onChange={(date) => setEndDate(date as Date | undefined)}
                placeholder="Fecha fin"
              />
            </div>
          </div>
        </div>
        
        {/* Filtros de tipo */}
        <div className="space-y-2">
          <Label>Tipo de actividad</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type as ActivityType) ? "default" : "outline"}
                className="cursor-pointer"
                style={{ 
                  backgroundColor: selectedTypes.includes(type as ActivityType) 
                    ? ACTIVITY_TYPE_COLORS[type as ActivityType] 
                    : 'transparent',
                  borderColor: ACTIVITY_TYPE_COLORS[type as ActivityType],
                  color: selectedTypes.includes(type as ActivityType) ? 'white' : 'inherit'
                }}
                onClick={() => handleTypeToggle(type as ActivityType)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Filtros de estado */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY_STATUS_LABELS).map(([status, label]) => (
              <Badge
                key={status}
                variant={selectedStatuses.includes(status as ActivityStatus) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleStatusToggle(status as ActivityStatus)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Filtros de prioridad */}
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY_PRIORITY_LABELS).map(([priority, label]) => (
              <Badge
                key={priority}
                variant={selectedPriorities.includes(priority as ActivityPriority) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handlePriorityToggle(priority as ActivityPriority)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Selector de usuario asignado */}
        <div className="space-y-2">
          <Label htmlFor="assigned-user">Usuario asignado</Label>
          <Select
            value={assignedUserId?.toString() || ""}
            onValueChange={value => setAssignedUserId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="assigned-user">
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los usuarios</SelectItem>
              {users.map((user: any) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Selector de cliente */}
        <div className="space-y-2">
          <Label htmlFor="customer">Cliente</Label>
          <Select
            value={customerId?.toString() || ""}
            onValueChange={value => setCustomerId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="customer">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los clientes</SelectItem>
              {customers.map((customer: any) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Selector de lead */}
        <div className="space-y-2">
          <Label htmlFor="lead">Lead</Label>
          <Select
            value={leadId?.toString() || ""}
            onValueChange={value => setLeadId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="lead">
              <SelectValue placeholder="Seleccionar lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los leads</SelectItem>
              {leads.map((lead: any) => (
                <SelectItem key={lead.id} value={lead.id.toString()}>
                  {lead.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Botón de reset */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleResetFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
};

export default ActivityFilters;