import React, { useState, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';

// Opciones para canal de comunicación
const channelOptions = [
  { value: "all", label: "Todos los canales" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
];

// Opciones para tipo de interacción
const typeOptions = [
  { value: "all", label: "Todos los tipos" },
  { value: "query", label: "Consulta" },
  { value: "complaint", label: "Queja" },
  { value: "followup", label: "Seguimiento" },
  { value: "order", label: "Pedido" },
  { value: "support", label: "Soporte" },
];

interface InteractionFiltersProps {
  filters: any;
  onApplyFilters: (filters: any) => void;
  onResetFilters: () => void;
}

export function InteractionFilters({ filters, onApplyFilters, onResetFilters }: InteractionFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [selectedContactType, setSelectedContactType] = useState<string>(filters.contactType || '');

  // Consulta de usuarios CRM
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });
  
  // Consulta de clientes
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
  });
  
  // Consulta de leads
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/leads');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
      }
    },
  });

  // Actualizar los filtros locales cuando cambien los filtros externos
  useEffect(() => {
    setLocalFilters(filters);
    setSelectedContactType(filters.contactType || '');
  }, [filters]);

  // Manejar cambios en los filtros
  const handleFilterChange = (name: string, value: string) => {
    // Si es tipo de contacto, resetear también el ID de contacto
    if (name === 'contactType') {
      setSelectedContactType(value);
      setLocalFilters({
        ...localFilters,
        contactType: value,
        contactId: '',
      });
    } else {
      setLocalFilters({
        ...localFilters,
        [name]: value,
      });
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
  };

  // Manejar el reseteo de filtros
  const handleReset = () => {
    onResetFilters();
  };
  
  // Obtener lista de contactos según el tipo seleccionado
  const getContactOptions = () => {
    if (selectedContactType === 'customer') {
      return [
        { value: "all", label: "Todos los clientes" },
        ...customers?.map(customer => ({
          value: customer.id.toString(),
          label: customer.name
        })) || []
      ];
    } else if (selectedContactType === 'lead') {
      return [
        { value: "all", label: "Todos los leads" },
        ...leads?.map(lead => ({
          value: lead.id.toString(),
          label: lead.name
        })) || []
      ];
    }
    return [];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Búsqueda de texto */}
      <div className="space-y-2">
        <Label htmlFor="query">Búsqueda</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="query"
            placeholder="Buscar en contenido..."
            className="pl-8"
            value={localFilters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
          />
        </div>
      </div>

      {/* Tipo de contacto */}
      <div className="space-y-2">
        <Label htmlFor="contactType">Tipo de contacto</Label>
        <Select
          value={localFilters.contactType}
          onValueChange={(value) => handleFilterChange('contactType', value)}
        >
          <SelectTrigger id="contactType">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="customer">Cliente</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacto específico (solo si se seleccionó un tipo) */}
      {selectedContactType && (
        <div className="space-y-2">
          <Label htmlFor="contactId">
            {selectedContactType === 'customer' ? 'Cliente' : 'Lead'}
          </Label>
          <Select
            value={localFilters.contactId}
            onValueChange={(value) => handleFilterChange('contactId', value)}
          >
            <SelectTrigger id="contactId">
              <SelectValue placeholder={`Todos los ${selectedContactType === 'customer' ? 'clientes' : 'leads'}`} />
            </SelectTrigger>
            <SelectContent>
              {getContactOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Canal de comunicación */}
      <div className="space-y-2">
        <Label htmlFor="channel">Canal</Label>
        <Select
          value={localFilters.channel}
          onValueChange={(value) => handleFilterChange('channel', value)}
        >
          <SelectTrigger id="channel">
            <SelectValue placeholder="Todos los canales" />
          </SelectTrigger>
          <SelectContent>
            {channelOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo de interacción */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select
          value={localFilters.type}
          onValueChange={(value) => handleFilterChange('type', value)}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Usuario asignado */}
      <div className="space-y-2">
        <Label htmlFor="assignedUserId">Asignado a</Label>
        <Select
          value={localFilters.assignedUserId}
          onValueChange={(value) => handleFilterChange('assignedUserId', value)}
        >
          <SelectTrigger id="assignedUserId">
            <SelectValue placeholder="Todos los usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {users?.map(user => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.fullName || `${user.firstName} ${user.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desde fecha */}
      <div className="space-y-2">
        <Label htmlFor="dateFrom">Desde fecha</Label>
        <Input
          id="dateFrom"
          type="date"
          value={localFilters.dateFrom}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
        />
      </div>

      {/* Hasta fecha */}
      <div className="space-y-2">
        <Label htmlFor="dateTo">Hasta fecha</Label>
        <Input
          id="dateTo"
          type="date"
          value={localFilters.dateTo}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
        />
      </div>

      {/* Botones */}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" className="w-full">
          Aplicar filtros
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={handleReset}
        >
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}