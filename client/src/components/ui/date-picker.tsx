import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date?: Date | null) => void;
  placeholder?: string;
  showTimePicker?: boolean;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  showTimePicker = false,
  disabled = false,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [hours, setHours] = React.useState<string>(
    value ? format(new Date(value), "HH") : "12"
  );
  const [minutes, setMinutes] = React.useState<string>(
    value ? format(new Date(value), "mm") : "00"
  );

  // Actualizar estados locales cuando cambia el valor externo
  React.useEffect(() => {
    if (value) {
      const newDate = new Date(value);
      setDate(newDate);
      setHours(format(newDate, "HH"));
      setMinutes(format(newDate, "mm"));
    } else {
      setDate(undefined);
      setHours("12");
      setMinutes("00");
    }
  }, [value]);

  // Combinar fecha y hora
  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      onChange?.(undefined);
      return;
    }

    setDate(newDate);

    // Combinar con la hora seleccionada si hay date picker
    if (showTimePicker) {
      const updatedDate = new Date(newDate);
      updatedDate.setHours(parseInt(hours));
      updatedDate.setMinutes(parseInt(minutes));
      onChange?.(updatedDate);
    } else {
      onChange?.(newDate);
    }
  };

  // Actualizar hora
  const handleHoursChange = (newHours: string) => {
    setHours(newHours);
    if (date) {
      const updatedDate = new Date(date);
      updatedDate.setHours(parseInt(newHours));
      updatedDate.setMinutes(parseInt(minutes));
      onChange?.(updatedDate);
    }
  };

  // Actualizar minutos
  const handleMinutesChange = (newMinutes: string) => {
    setMinutes(newMinutes);
    if (date) {
      const updatedDate = new Date(date);
      updatedDate.setHours(parseInt(hours));
      updatedDate.setMinutes(parseInt(newMinutes));
      onChange?.(updatedDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            {showTimePicker ? (
              <>
                <CalendarIcon className="mr-1 h-4 w-4" />
                <Clock className="ml-2 mr-1 h-4 w-4" />
              </>
            ) : (
              <CalendarIcon className="mr-2 h-4 w-4" />
            )}
            {date ? (
              <span>
                {format(date, showTimePicker ? "PPP 'a las' HH:mm" : "PPP", {
                  locale: es,
                })}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          locale={es}
        />
        {showTimePicker && (
          <div className="p-3 border-t border-border">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Hora</div>
              <div className="flex space-x-2">
                <Select value={hours} onValueChange={handleHoursChange}>
                  <SelectTrigger className="w-16">
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xl flex items-center">:</span>
                <Select value={minutes} onValueChange={handleMinutesChange}>
                  <SelectTrigger className="w-16">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={(i * 5).toString().padStart(2, "0")}>
                        {(i * 5).toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}