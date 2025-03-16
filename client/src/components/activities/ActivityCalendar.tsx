import * as React from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  LayoutList, 
  Search, 
  X,
  Calendar as CalendarSquare
} from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  ActivityEvent,
  ActivityType,
  ActivityStatus,
  ActivityPriority,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_PRIORITY_CALENDAR_COLORS
} from './types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CreateActivityDialog } from './CreateActivityDialog';

// Configure moment locale
moment.locale('es');
const localizer = momentLocalizer(moment);

interface ActivityCalendarProps {
  events: ActivityEvent[];
  onEventClick: (event: ActivityEvent) => void;
  onNavigate?: (date: Date, view: string) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onViewTypeChange?: (viewType: string) => void;
  onSearchChange?: (query: string) => void;
  onFilterClick?: () => void;
  onListViewClick?: () => void;
  loading: boolean;
}

export function ActivityCalendar({
  events,
  onEventClick,
  onNavigate,
  onSelectSlot,
  onViewTypeChange,
  onSearchChange,
  onFilterClick,
  onListViewClick,
  loading = false
}: ActivityCalendarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewType, setViewType] = React.useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [selectedStartDate, setSelectedStartDate] = React.useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = React.useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<ActivityEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = React.useState(false);
  
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { toast } = useToast();

  // Handle date navigation
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    let newDate: Date;
    
    if (action === 'PREV') {
      newDate = moment(currentDate).subtract(1, viewType).toDate();
    } else if (action === 'NEXT') {
      newDate = moment(currentDate).add(1, viewType).toDate();
    } else if (action === 'TODAY') {
      newDate = new Date();
    } else {
      newDate = action;
    }
    
    setCurrentDate(newDate);
    if (onNavigate) {
      onNavigate(newDate, viewType);
    }
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Debounce search input
    const timeoutId = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(e.target.value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle view type change
  const handleViewTypeChange = (value: string) => {
    setViewType(value as 'month' | 'week' | 'day' | 'agenda');
    if (onViewTypeChange) {
      onViewTypeChange(value);
    }
  };

  // Handle event click
  const handleEventClick = (event: ActivityEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
    onEventClick(event);
  };

  // Handle slot selection (creating new event)
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedStartDate(slotInfo.start);
    setSelectedEndDate(slotInfo.end);
    setShowCreateDialog(true);
    
    if (onSelectSlot) {
      onSelectSlot(slotInfo);
    }
  };

  // Custom event component
  const EventComponent = ({ event }: { event: ActivityEvent }) => {
    const priorityColors = ACTIVITY_PRIORITY_CALENDAR_COLORS[event.priority];

    return (
      <div
        style={{
          backgroundColor: priorityColors.bgColor,
          color: priorityColors.textColor,
          borderLeft: `3px solid ${priorityColors.borderColor}`,
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          padding: '2px 4px',
          borderRadius: '2px',
          overflow: 'hidden',
          fontSize: isMobile ? '0.7rem' : '0.8rem'
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
          {!isMobile && (
            <span style={{ marginRight: '4px', fontWeight: 600 }}>
              {ACTIVITY_TYPE_LABELS[event.type]}:
            </span>
          )}
          {event.title}
        </div>
      </div>
    );
  };

  // Format title for the calendar
  const formatCalendarTitle = () => {
    const date = moment(currentDate);
    
    switch (viewType) {
      case 'month':
        return date.format('MMMM YYYY');
      case 'week':
        const startOfWeek = date.startOf('week').format('D MMM');
        const endOfWeek = date.endOf('week').format('D MMM');
        return `${startOfWeek} - ${endOfWeek}, ${date.format('YYYY')}`;
      case 'day':
        return date.format('dddd, D [de] MMMM, YYYY');
      case 'agenda':
        return 'Agenda';
      default:
        return '';
    }
  };

  // Custom toolbar component
  const CalendarToolbar = () => (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigate('PREV')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigate('TODAY')}
          >
            Hoy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigate('NEXT')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-lg font-medium hidden sm:block">
          {formatCalendarTitle()}
        </div>
        <div className="flex gap-2">
          <Select
            value={viewType}
            onValueChange={handleViewTypeChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
            </SelectContent>
          </Select>
          {onListViewClick && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onListViewClick}
              className="hidden sm:flex"
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Vista Lista
            </Button>
          )}
          {onFilterClick && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onFilterClick}
              className="hidden sm:flex"
            >
              <Search className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          )}
          {onListViewClick && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onListViewClick}
              className="sm:hidden"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          )}
          {onFilterClick && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onFilterClick}
              className="sm:hidden"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="sm:hidden text-center text-sm font-medium">
        {formatCalendarTitle()}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar actividades..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-8 w-full"
        />
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-0 top-0 h-full" 
            onClick={() => {
              setSearchQuery('');
              if (onSearchChange) {
                onSearchChange('');
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Custom formats
  const calendarFormats = {
    // Month view
    monthHeaderFormat: (date: Date) => moment(date).format('MMMM YYYY'),
    weekdayFormat: (date: Date) => moment(date).format('ddd'),
    
    // Week view
    dayFormat: (date: Date) => moment(date).format('ddd D'),
    dayHeaderFormat: (date: Date) => moment(date).format('dddd D'),
    
    // Day view
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture: string, localizer: any) => {
      return `${moment(start).format('D MMMM')} - ${moment(end).format('D MMMM YYYY')}`;
    },
    
    // Time formats
    timeGutterFormat: (date: Date, culture: string, localizer: any) => moment(date).format('HH:mm'),
    eventTimeRangeFormat: (range: { start: Date; end: Date }) => {
      return `${moment(range.start).format('HH:mm')} - ${moment(range.end).format('HH:mm')}`;
    },
    
    // Agenda view
    agendaDateFormat: (date: Date) => moment(date).format('D MMMM YYYY'),
    agendaTimeFormat: (date: Date) => moment(date).format('HH:mm'),
    agendaTimeRangeFormat: (range: { start: Date; end: Date }) => {
      return `${moment(range.start).format('HH:mm')} - ${moment(range.end).format('HH:mm')}`;
    },
  };

  // Get appropriate view
  const getView = () => {
    if (isMobile) {
      // Simplify view for mobile
      switch (viewType) {
        case 'month': return Views.MONTH;
        case 'week': return Views.WEEK;
        case 'day': return Views.DAY;
        case 'agenda': return Views.AGENDA;
        default: return Views.MONTH;
      }
    } else {
      // Full options for desktop
      switch (viewType) {
        case 'month': return Views.MONTH;
        case 'week': return Views.WEEK;
        case 'day': return Views.DAY;
        case 'agenda': return Views.AGENDA;
        default: return Views.MONTH;
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <CalendarToolbar />
      
      <div className="flex-1 min-h-[70vh]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={getView()}
          formats={calendarFormats}
          date={currentDate}
          components={{
            event: EventComponent,
          }}
          onSelectEvent={handleEventClick}
          onSelectSlot={handleSelectSlot}
          selectable
          popup
          messages={{
            today: 'Hoy',
            previous: 'Anterior',
            next: 'Siguiente',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Actividad',
            allDay: 'Todo el día',
            showMore: (total) => `+ ${total} más`,
            noEventsInRange: 'No hay actividades en este rango de fechas'
          }}
        />
      </div>

      {/* Create new activity dialog */}
      {showCreateDialog && (
        <CreateActivityDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          startDate={selectedStartDate || new Date()}
          endDate={selectedEndDate || moment().add(1, 'hour').toDate()}
          onSuccess={(activity) => {
            toast({
              title: "Actividad creada con éxito",
              description: `${activity.title} ha sido programada.`,
              variant: "success"
            });
          }}
          onError={(error) => {
            toast({
              title: "Error al crear la actividad",
              description: error,
              variant: "destructive"
            });
          }}
        />
      )}

      {/* Event details dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Actividad</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Badge className={cn(
                  "mt-0.5",
                  selectedEvent.status === ActivityStatus.COMPLETED ? "bg-green-100 text-green-800 hover:bg-green-100" :
                  selectedEvent.status === ActivityStatus.CANCELLED ? "bg-red-100 text-red-800 hover:bg-red-100" :
                  selectedEvent.status === ActivityStatus.IN_PROGRESS ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                  selectedEvent.status === ActivityStatus.POSTPONED ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
                  "bg-slate-100 text-slate-800 hover:bg-slate-100"
                )}>
                  {ACTIVITY_STATUS_LABELS[selectedEvent.status]}
                </Badge>
                <Badge className={cn(
                  "mt-0.5",
                  selectedEvent.type === ActivityType.CALL ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                  selectedEvent.type === ActivityType.MEETING ? "bg-purple-100 text-purple-800 hover:bg-purple-100" :
                  selectedEvent.type === ActivityType.TASK ? "bg-green-100 text-green-800 hover:bg-green-100" :
                  selectedEvent.type === ActivityType.EMAIL ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
                  "bg-indigo-100 text-indigo-800 hover:bg-indigo-100"
                )}>
                  {ACTIVITY_TYPE_LABELS[selectedEvent.type]}
                </Badge>
                <Badge className={cn(
                  "mt-0.5",
                  selectedEvent.priority === ActivityPriority.URGENT ? "bg-red-100 text-red-800 hover:bg-red-100" :
                  selectedEvent.priority === ActivityPriority.HIGH ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
                  selectedEvent.priority === ActivityPriority.MEDIUM ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                  "bg-slate-100 text-slate-800 hover:bg-slate-100"
                )}>
                  {ACTIVITY_PRIORITY_LABELS[selectedEvent.priority]}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">{selectedEvent.title}</h3>
                {selectedEvent.resource?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.resource.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Inicio</p>
                  <p className="text-sm">{format(selectedEvent.start, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Fin</p>
                  <p className="text-sm">{format(selectedEvent.end, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
              
              {selectedEvent.resource?.location && (
                <div>
                  <p className="text-sm font-medium">Ubicación</p>
                  <p className="text-sm">{selectedEvent.resource.location}</p>
                </div>
              )}
              
              {selectedEvent.resource?.notes && (
                <div>
                  <p className="text-sm font-medium">Notas</p>
                  <p className="text-sm">{selectedEvent.resource.notes}</p>
                </div>
              )}
              
              {selectedEvent.resource?.userName && (
                <div>
                  <p className="text-sm font-medium">Responsable</p>
                  <p className="text-sm">{selectedEvent.resource.userName}</p>
                </div>
              )}
              
              {(selectedEvent.resource?.customerName || selectedEvent.resource?.leadName || selectedEvent.resource?.opportunityName) && (
                <div>
                  <p className="text-sm font-medium">Relacionado con</p>
                  {selectedEvent.resource.customerName && (
                    <p className="text-sm">Cliente: {selectedEvent.resource.customerName}</p>
                  )}
                  {selectedEvent.resource.leadName && (
                    <p className="text-sm">Prospecto: {selectedEvent.resource.leadName}</p>
                  )}
                  {selectedEvent.resource.opportunityName && (
                    <p className="text-sm">Oportunidad: {selectedEvent.resource.opportunityName}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => {
                // Check if activity is editable
                if (selectedEvent && selectedEvent.id) {
                  setShowEventDetails(false);
                  setSelectedStartDate(selectedEvent.start);
                  setSelectedEndDate(selectedEvent.end);
                  // Pass event data to edit dialog
                  // Implementation will depend on how the edit dialog works
                  // setShowEditDialog(true);
                  
                  // For now just close details
                  toast({
                    title: "Funcionalidad en desarrollo",
                    description: "La edición de actividades estará disponible pronto",
                    variant: "info"
                  });
                }
              }}
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}