import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Check, 
  ChevronDown 
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { brandEnum } from "@db/schema";
import { format } from "date-fns";

export type FilterValue = string | string[] | Date | null;

export interface FilterOption {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'multiselect';
  options?: { value: string; label: string }[];
  defaultValue?: FilterValue;
}

export interface FilterState {
  [key: string]: FilterValue;
}

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  filterOptions: FilterOption[];
  onChange: (searchText: string, filters: FilterState) => void;
  onReset: () => void;
}

export function SearchFilterBar({
  searchPlaceholder = "Buscar...",
  filterOptions,
  onChange,
  onReset
}: SearchFilterBarProps) {
  const [searchText, setSearchText] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Initialize with default values if they exist
    const defaultFilters: FilterState = {};
    filterOptions.forEach(option => {
      if (option.defaultValue !== undefined) {
        defaultFilters[option.id] = option.defaultValue;
      }
    });
    return defaultFilters;
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Update active filters count
  const updateActiveFiltersCount = (newFilters: FilterState) => {
    const count = Object.values(newFilters).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== '';
    }).length;
    setActiveFiltersCount(count);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);
    onChange(newSearchText, filters);
  };

  // Handle filter change
  const handleFilterChange = (id: string, value: FilterValue) => {
    const newFilters = { ...filters, [id]: value };
    setFilters(newFilters);
    updateActiveFiltersCount(newFilters);
    onChange(searchText, newFilters);
  };

  // Reset all filters
  const handleReset = () => {
    setSearchText("");
    const defaultFilters: FilterState = {};
    filterOptions.forEach(option => {
      if (option.defaultValue !== undefined) {
        defaultFilters[option.id] = option.defaultValue;
      }
    });
    setFilters(defaultFilters);
    setActiveFiltersCount(0);
    onReset();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={handleSearchChange}
            className="pl-8"
          />
          {searchText && (
            <X
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => {
                setSearchText("");
                onChange("", filters);
              }}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] sm:w-[400px]" align="end">
              <div className="space-y-4">
                <div className="font-medium flex items-center justify-between">
                  <span>Filtros avanzados</span>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {filterOptions.map((option) => (
                    <div key={option.id} className="grid gap-1">
                      <label className="text-sm font-medium">{option.label}</label>
                      {option.type === 'text' && (
                        <Input
                          value={(filters[option.id] || '') as string}
                          onChange={(e) => handleFilterChange(option.id, e.target.value)}
                          placeholder={`Filtrar por ${option.label.toLowerCase()}`}
                        />
                      )}
                      {option.type === 'select' && option.options && (
                        <Select
                          value={(filters[option.id] || '') as string}
                          onValueChange={(value) => handleFilterChange(option.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Seleccionar ${option.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos</SelectItem>
                            {option.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {option.type === 'date' && (
                        <DatePicker
                          value={filters[option.id] as Date | undefined}
                          onChange={(date) => handleFilterChange(option.id, date || null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setShowAdvanced(false)}>
                    <Check className="mr-2 h-4 w-4" />
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {(searchText || activeFiltersCount > 0) && (
            <Button variant="ghost" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {activeFiltersCount > 0 && (
        <Card className="bg-muted/40 border-dashed">
          <CardContent className="py-2 px-3">
            <div className="flex flex-wrap gap-1">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;

                const option = filterOptions.find(opt => opt.id === key);
                if (!option) return null;

                let displayValue: string;

                if (option.type === 'select') {
                  const selectedOption = option.options?.find(opt => opt.value === value);
                  displayValue = selectedOption?.label || value as string;
                } else if (option.type === 'date' && value instanceof Date) {
                  displayValue = format(value, 'dd/MM/yyyy');
                } else {
                  displayValue = value as string;
                }

                return (
                  <Badge 
                    key={key} 
                    variant="outline"
                    className="flex items-center gap-1 bg-background"
                  >
                    <span className="font-medium">{option.label}:</span> {displayValue}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => {
                        const newFilters = { ...filters };
                        if (option.defaultValue !== undefined) {
                          newFilters[key] = option.defaultValue;
                        } else {
                          delete newFilters[key];
                        }
                        setFilters(newFilters);
                        updateActiveFiltersCount(newFilters);
                        onChange(searchText, newFilters);
                      }}
                    />
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}