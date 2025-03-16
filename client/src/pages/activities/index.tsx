import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarDays, List, Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivitiesPage() {
  const [activeView, setActiveView] = useState("list");
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades</h1>
          <p className="text-muted-foreground">
            Gestiona las actividades y eventos del CRM
          </p>
        </div>
        
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>
      
      <Tabs
        defaultValue="list"
        value={activeView}
        onValueChange={setActiveView}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto mb-2 sm:mb-0">
            <TabsTrigger value="list" className="flex items-center">
              <List className="mr-2 h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center">
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendario
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Actividades</CardTitle>
              <CardDescription>
                Vista detallada de todas las actividades programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Implementando vista de lista de actividades...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Actividades</CardTitle>
              <CardDescription>
                Vista de calendario de todos los eventos programados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[500px] flex items-center justify-center">
                <p className="text-muted-foreground">Implementando vista de calendario...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}