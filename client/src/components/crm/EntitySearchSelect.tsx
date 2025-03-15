import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormControl } from '@/components/ui/form';

interface EntityOption {
  id: number;
  name: string;
  [key: string]: any;
}

interface EntitySearchSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  apiEndpoint: string;
  placeholder: string;
  entityName: string;
  emptyMessage: string;
  filter?: (entity: EntityOption) => boolean;
}

export function EntitySearchSelect({
  value,
  onValueChange,
  apiEndpoint,
  placeholder,
  entityName,
  emptyMessage,
  filter = () => true,
}: EntitySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Usar enabled para controlar cuándo se realiza la consulta
  const { data: entities = [], isLoading, refetch } = useQuery<EntityOption[]>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      console.log(`Obteniendo datos desde ${apiEndpoint}`);
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`Error al cargar ${entityName.toLowerCase()}`);
      }
      const data = await response.json();
      console.log(`Datos obtenidos (${data.length} ${entityName.toLowerCase()}):`, data);
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 3000, // 3 segundos antes de considerar los datos obsoletos
  });
  
  // Refrescar datos al abrir el selector
  useEffect(() => {
    if (open) {
      console.log(`Selector ${entityName} abierto, refrescando datos...`);
      refetch();
    }
  }, [open, refetch, entityName]);

  // Filtrar entidades
  const filteredEntities = Array.isArray(entities) 
    ? entities
        .filter(filter)
        .filter(entity => 
          entity && entity.name && 
          entity.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Log para depuración y selección previa
  useEffect(() => {
    if (Array.isArray(entities) && entities.length > 0) {
      console.log(`${entityName} cargados:`, entities);
      
      // Si hay un valor seleccionado, verificamos que exista en la lista
      if (value) {
        const selectedEntity = entities.find(e => e.id.toString() === value);
        if (selectedEntity) {
          console.log(`${entityName} seleccionado:`, selectedEntity);
        } else {
          console.warn(`El ${entityName.toLowerCase()} seleccionado (ID: ${value}) no existe en la lista actual`);
        }
      }
    }
  }, [entities, value, entityName]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value && filteredEntities.length > 0
              ? filteredEntities.find((entity) => entity.id.toString() === value)?.name || placeholder
              : placeholder}
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={`Buscar ${entityName.toLowerCase()}...`}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Cargando {entityName.toLowerCase()}...</p>
            </div>
          ) : (
            <>
              <CommandEmpty>
                {emptyMessage}
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-auto">
                {filteredEntities.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    No se encontraron {entityName.toLowerCase()} con el filtro actual
                  </div>
                ) : (
                  filteredEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={entity.id.toString()}
                      onSelect={(currentValue) => {
                        console.log(`Seleccionado ${entityName}:`, currentValue);
                        onValueChange(currentValue === value ? '' : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === entity.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{entity.name}</span>
                      </div>
                      {entity.email && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {entity.email}
                        </span>
                      )}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}