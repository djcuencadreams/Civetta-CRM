import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, ArrowLeft, ArrowRight, Filter, User, Clock, CheckCircle, XCircle, Calendar as CalendarFull, Calendar } from "lucide-react";

import { PageHeader } from "../components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ActivityForm } from "../components/crm/ActivityForm";
import { Activity } from "./types/activities";

export default function Activities() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  
  const queryClient = useQueryClient();

  // Calcular fechas para filtrar actividades según la vista seleccionada
  const getDateRange = () => {
    switch (calendarView) {
      case "month":
        return {
          startDate: startOfMonth(selectedDate),
          endDate: endOfMonth(selectedDate)
        };
      case "week":
        return {
          startDate: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case "day":
        return {
          startDate: startOfDay(selectedDate),
          endDate: endOfDay(selectedDate)
        };
    }
  };

  const { startDate, endDate } = getDateRange();

  // Obtener actividades filtradas por fecha y otros filtros
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", startDate, endDate, filterStatus, filterType, filterAssigned],
    queryFn: async () => {
      let url = "/api/activities?";
      url += `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }
      
      if (filterType !== "all") {
        url += `&type=${filterType}`;
      }
      
      if (filterAssigned !== "all") {
        url += `&userId=${filterAssigned}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Error al cargar actividades");
      }
      
      return response.json();
    }
  });
  
  // Obtener usuarios del CRM
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }
      
      return response.json();
    }
  });

  // Mutación para cambiar el estado de una actividad
  const updateActivityStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error("Error al actualizar el estado de la actividad");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la actividad ha sido actualizado correctamente."
      });
    }
  });

  // Mutación para eliminar una actividad
  const deleteActivity = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/activities/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Error al eliminar la actividad");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad ha sido eliminada correctamente."
      });
    }
  });

  // Función para avanzar/retroceder en la vista del calendario
  const navigateCalendar = (direction: "prev" | "next") => {
    switch (calendarView) {
      case "month":
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + (direction === "next" ? 1 : -1), 1));
        break;
      case "week":
        setSelectedDate(prev => addDays(prev, direction === "next" ? 7 : -7));
        break;
      case "day":
        setSelectedDate(prev => addDays(prev, direction === "next" ? 1 : -1));
        break;
    }
  };

  // Función para renderizar el título del calendario según la vista
  const renderCalendarTitle = () => {
    switch (calendarView) {
      case "month":
        return format(selectedDate, "MMMM yyyy", { locale: es });
      case "week":
        return `${format(startDate, "d", { locale: es })}-${format(endDate, "d 'de' MMMM yyyy", { locale: es })}`;
      case "day":
        return format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
    }
  };

  // Renderizar el contenido del calendario según la vista seleccionada
  const renderCalendarContent = () => {
    switch (calendarView) {
      case "month":
        return renderMonthView();
      case "week":
        return renderWeekView();
      case "day":
        return renderDayView();
    }
  };

  // Obtener las actividades para un día específico
  const getActivitiesForDay = (day: Date) => {
    return activities.filter((activity: Activity) => 
      isSameDay(new Date(activity.startTime), day));
  };

  // Renderizar la vista mensual
  const renderMonthView = () => {
    // Obtener el primer día del mes
    const firstDayOfMonth = startOfMonth(selectedDate);
    
    // Obtener el primer día de la semana del calendario (lunes)
    const firstDayOfCalendar = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    
    // Crear un array de 42 días (6 semanas) para mostrar en el calendario
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = addDays(firstDayOfCalendar, i);
      
      // Verificar si el día está en el mes actual
      const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
      
      // Obtener las actividades para este día
      const dayActivities = getActivitiesForDay(day);
      
      days.push(
        <div 
          key={i} 
          className={`border p-1 min-h-[100px] ${isCurrentMonth ? "bg-background" : "bg-muted/20"}`}
          onClick={() => {
            setSelectedDate(day);
            setCalendarView("day");
          }}
        >
          <div className="font-medium text-sm">
            {format(day, "d", { locale: es })}
          </div>
          <div className="space-y-1 mt-1">
            {dayActivities.slice(0, 3).map((activity: Activity) => (
              <div 
                key={activity.id}
                className={`text-xs p-1 rounded cursor-pointer truncate ${
                  activity.status === "completed" ? "bg-green-100 text-green-800" :
                  activity.status === "cancelled" ? "bg-red-100 text-red-800" :
                  activity.priority === "high" ? "bg-orange-100 text-orange-800" :
                  "bg-blue-100 text-blue-800"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedActivity(activity);
                  setIsEditActivityOpen(true);
                }}
              >
                {activity.title}
              </div>
            ))}
            {dayActivities.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{dayActivities.length - 3} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border">
        <div className="border p-2 font-medium text-center bg-muted/20">Lun</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Mar</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Mié</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Jue</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Vie</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Sáb</div>
        <div className="border p-2 font-medium text-center bg-muted/20">Dom</div>
        {days}
      </div>
    );
  };

  // Renderizar la vista semanal
  const renderWeekView = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      const dayActivities = getActivitiesForDay(day);
      
      days.push(
        <div key={i} className="border flex flex-col min-h-[300px]">
          <div 
            className="p-2 text-center font-medium border-b bg-muted/20 cursor-pointer"
            onClick={() => {
              setSelectedDate(day);
              setCalendarView("day");
            }}
          >
            {format(day, "EEE, d", { locale: es })}
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {dayActivities.map((activity: Activity) => (
              <div 
                key={activity.id}
                className={`p-2 rounded text-sm cursor-pointer ${
                  activity.status === "completed" ? "bg-green-100 text-green-800" :
                  activity.status === "cancelled" ? "bg-red-100 text-red-800" :
                  activity.priority === "high" ? "bg-orange-100 text-orange-800" :
                  "bg-blue-100 text-blue-800"
                }`}
                onClick={() => {
                  setSelectedActivity(activity);
                  setIsEditActivityOpen(true);
                }}
              >
                <div className="font-medium">{activity.title}</div>
                <div className="text-xs mt-1">
                  {format(new Date(activity.startTime), "HH:mm", { locale: es })} - 
                  {format(new Date(activity.endTime), "HH:mm", { locale: es })}
                </div>
              </div>
            ))}
            {dayActivities.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No hay actividades
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-4">{days}</div>
    );
  };

  // Renderizar la vista diaria
  const renderDayView = () => {
    const dayActivities = getActivitiesForDay(selectedDate);
    
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="text-lg font-medium">
          Actividades para {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
        </h3>
        
        {dayActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay actividades programadas para este día
          </div>
        ) : (
          <div className="space-y-4">
            {dayActivities.map((activity: Activity) => (
              <Card key={activity.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{activity.title}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(activity.startTime), "HH:mm", { locale: es })} - 
                        {format(new Date(activity.endTime), "HH:mm", { locale: es })}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={
                        activity.status === "completed" ? "success" :
                        activity.status === "cancelled" ? "destructive" :
                        activity.priority === "high" ? "default" : "default"
                      }
                    >
                      {activity.status === "pending" ? "Pendiente" :
                       activity.status === "completed" ? "Completada" : "Cancelada"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>
                        {activity.assignedUser?.fullName || `Usuario #${activity.assignedUserId}`}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>
                        {activity.type === "call" ? "Llamada" :
                         activity.type === "meeting" ? "Reunión" :
                         activity.type === "task" ? "Tarea" : "Seguimiento"}
                      </span>
                    </div>
                    {(activity.customerId || activity.leadId || activity.opportunityId) && (
                      <div className="col-span-2 flex items-center">
                        <span className="text-muted-foreground mr-1">Asociado a:</span>
                        <span>
                          {activity.customer?.name || 
                           activity.lead?.name || 
                           activity.opportunity?.name || ""}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedActivity(activity);
                      setIsEditActivityOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  
                  {activity.status === "pending" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                      onClick={() => {
                        updateActivityStatus.mutate({ 
                          id: activity.id, 
                          status: "completed"
                        });
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                  )}
                  
                  {activity.status === "pending" && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        updateActivityStatus.mutate({ 
                          id: activity.id, 
                          status: "cancelled"
                        });
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4">
      <PageHeader
        title="Calendario de Actividades"
        description="Gestiona tus actividades, reuniones, llamadas y tareas."
      />
      
      <div className="flex flex-col space-y-4">
        {/* Controles superiores */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateCalendar("prev")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedDate(new Date())}
            >
              Hoy
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateCalendar("next")}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">{renderCalendarTitle()}</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setIsAddActivityOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Nueva Actividad
            </Button>
          </div>
        </div>
        
        {/* Tabs para cambiar de vista */}
        <Tabs 
          defaultValue="month" 
          value={calendarView}
          onValueChange={(value) => setCalendarView(value as "month" | "week" | "day")}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Día</TabsTrigger>
            </TabsList>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Filtrar actividades</h4>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Estado:</label>
                        <div className="col-span-3">
                          <Select
                            value={filterStatus}
                            onValueChange={setFilterStatus}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pending">Pendientes</SelectItem>
                              <SelectItem value="completed">Completadas</SelectItem>
                              <SelectItem value="cancelled">Canceladas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Tipo:</label>
                        <div className="col-span-3">
                          <Select
                            value={filterType}
                            onValueChange={setFilterType}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="call">Llamadas</SelectItem>
                              <SelectItem value="meeting">Reuniones</SelectItem>
                              <SelectItem value="task">Tareas</SelectItem>
                              <SelectItem value="followup">Seguimientos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Asignado:</label>
                        <div className="col-span-3">
                          <Select
                            value={filterAssigned}
                            onValueChange={setFilterAssigned}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {users.map((user: {id: number, fullName: string}) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <TabsContent value="month" className="mt-0">
            {renderCalendarContent()}
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            {renderCalendarContent()}
          </TabsContent>
          <TabsContent value="day" className="mt-0">
            {renderCalendarContent()}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal para agregar actividad */}
      <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nueva Actividad</DialogTitle>
            <DialogDescription>
              Crea una nueva actividad en el calendario.
            </DialogDescription>
          </DialogHeader>
          
          <ActivityForm 
            onSubmit={() => {
              setIsAddActivityOpen(false);
              queryClient.invalidateQueries({ queryKey: ["activities"] });
            }}
            onCancel={() => setIsAddActivityOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Modal para editar actividad */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Actividad</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la actividad.
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <ActivityForm 
              activity={selectedActivity}
              onSubmit={() => {
                setIsEditActivityOpen(false);
                setSelectedActivity(null);
                queryClient.invalidateQueries({ queryKey: ["activities"] });
              }}
              onCancel={() => {
                setIsEditActivityOpen(false);
                setSelectedActivity(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}