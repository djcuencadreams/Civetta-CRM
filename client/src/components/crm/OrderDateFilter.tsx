import React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface OrderDateFilterProps {
  onRangeChange: (range: DateRange | undefined) => void;
  initialRange?: DateRange;
}

export function OrderDateFilter({ onRangeChange, initialRange }: OrderDateFilterProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialRange);

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDate(range);
    onRangeChange(range);
  };

  const clearFilter = () => {
    setDate(undefined);
    onRangeChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="daterange" className="whitespace-nowrap">Filtrar por fecha:</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="daterange"
            variant={"outline"}
            className={cn(
              "min-w-[250px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d 'de' MMMM 'de' yyyy", { locale: es })} -{" "}
                  {format(date.to, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </>
              ) : (
                format(date.from, "d 'de' MMMM 'de' yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
      
      {date && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilter}
          className="text-muted-foreground h-8"
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}