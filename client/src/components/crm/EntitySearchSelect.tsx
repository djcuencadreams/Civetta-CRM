import { useState, useEffect, useMemo } from 'react';
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
  CommandList,
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

  // Búsqueda de datos
  const { data = [], isLoading } = useQuery<EntityOption[]>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      console.log(`Obteniendo datos desde ${apiEndpoint}`);
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`Error al cargar ${entityName.toLowerCase()}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error(`Los datos recibidos de ${apiEndpoint} no son un array:`, data);
          return [];
        }
        
        console.log(`Datos obtenidos (${data.length} ${entityName.toLowerCase()}):`, data);
        return data;
      } catch (error) {
        console.error(`Error al obtener datos de ${entityName}:`, error);
        return [];
      }
    },
  });

  // Filtrar entidades según criterios de búsqueda
  const filteredEntities = useMemo(() => {
    return data
      .filter(filter)
      .filter(entity => {
        if (!searchQuery || searchQuery.trim() === '') return true;
        
        const query = searchQuery.toLowerCase().trim();
        
        const nameMatch = entity.name?.toLowerCase().includes(query);
        const emailMatch = entity.email?.toLowerCase().includes(query);
        const idMatch = String(entity.id).includes(query);
        
        if (nameMatch || emailMatch || idMatch) {
          console.log(`Coincidencia encontrada para "${query}":`, entity.name);
        }
        
        return nameMatch || emailMatch || idMatch;
      });
  }, [data, searchQuery, filter]);

  // Nombre para mostrar en el botón
  const selectedItem = useMemo(() => {
    if (!value) return undefined;
    return data.find(item => String(item.id) === value);
  }, [data, value]);

  // Para debugging
  useEffect(() => {
    if (open) {
      console.log(`Selector ${entityName} abierto - ${filteredEntities.length} resultados filtrados de ${data.length} totales`);
    }
  }, [open, filteredEntities.length, data.length, entityName]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            onClick={() => setOpen(prev => !prev)}
          >
            {selectedItem?.name || placeholder}
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder={`Buscar ${entityName.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          
          <CommandList>
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
                
                <CommandGroup heading={entityName} className="max-h-60 overflow-y-auto">
                  {filteredEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={String(entity.id)}
                      onSelect={(currentValue) => {
                        console.log(`Seleccionado ${entityName}:`, currentValue);
                        onValueChange(currentValue === value ? '' : currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === String(entity.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{entity.name}</span>
                        {entity.email && (
                          <span className="text-xs text-muted-foreground">
                            {entity.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}