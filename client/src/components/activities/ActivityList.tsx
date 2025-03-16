import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Check, 
  Clock, 
  Ban,
  Calendar,
  FileEdit,
  Phone,
  Mail,
  Users,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CalendarX,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActivityEvent, Activity, ActivityType, ActivityStatus, ActivityPriority, ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS, ACTIVITY_PRIORITY_LABELS } from './types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateActivityDialog } from './CreateActivityDialog';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: number) => Promise<void>;
  onStatusChange: (id: number, status: ActivityStatus) => Promise<void>;
  onEdit: (activity: Activity) => void;
  loading: boolean;
  onRefresh: () => void;
}

export function ActivityList({
  activities,
  onDelete,
  onStatusChange,
  onEdit,
  loading = false,
  onRefresh
}: ActivityListProps) {
  const { toast } = useToast();
  const [sortField, setSortField] = React.useState<keyof Activity>('startDate');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [activityToDelete, setActivityToDelete] = React.useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = React.useState<number[]>([]);
  const [isAllSelected, setIsAllSelected] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  // Handle sorting
  const handleSort = (field: keyof Activity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted activities
  const getSortedActivities = () => {
    if (!activities) return [];
    
    return [...activities].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases for certain fields
      if (sortField === 'startDate' || sortField === 'endDate' || sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      setDeleteConfirmOpen(false);
      await onDelete(id);
      toast.success('Actividad eliminada correctamente');
      onRefresh();
    } catch (error) {
      console.error('Error al eliminar la actividad:', error);
      toast.error('Error al eliminar la actividad');
    }
  };

  // Handle status change
  const handleStatusChange = async (id: number, status: ActivityStatus) => {
    try {
      await onStatusChange(id, status);
      toast.success('Estado actualizado correctamente');
      onRefresh();
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  // Handle edit
  const handleEdit = (activity: Activity) => {
    onEdit(activity);
  };

  // Handle bulk actions
  const handleSelectAll = (checked: boolean) => {
    setIsAllSelected(checked);
    if (checked) {
      setSelectedActivities(activities.map(activity => activity.id));
    } else {
      setSelectedActivities([]);
    }
  };

  const handleSelectActivity = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedActivities(prev => [...prev, id]);
    } else {
      setSelectedActivities(prev => prev.filter(activityId => activityId !== id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedActivities) {
        await onDelete(id);
      }
      toast.success(`${selectedActivities.length} actividades eliminadas correctamente`);
      setSelectedActivities([]);
      setIsAllSelected(false);
      onRefresh();
    } catch (error) {
      console.error('Error al eliminar actividades:', error);
      toast.error('Error al eliminar actividades');
    }
  };

  const handleBulkStatusChange = async (status: ActivityStatus) => {
    try {
      for (const id of selectedActivities) {
        await onStatusChange(id, status);
      }
      toast.success(`${selectedActivities.length} actividades actualizadas correctamente`);
      setSelectedActivities([]);
      setIsAllSelected(false);
      onRefresh();
    } catch (error) {
      console.error('Error al actualizar actividades:', error);
      toast.error('Error al actualizar actividades');
    }
  };

  // Render type icon
  const renderTypeIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.CALL:
        return <Phone className="h-4 w-4 text-blue-600" />;
      case ActivityType.MEETING:
        return <Users className="h-4 w-4 text-purple-600" />;
      case ActivityType.TASK:
        return <FileEdit className="h-4 w-4 text-green-600" />;
      case ActivityType.EMAIL:
        return <Mail className="h-4 w-4 text-amber-600" />;
      case ActivityType.FOLLOW_UP:
        return <Calendar className="h-4 w-4 text-indigo-600" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Render status icon
  const renderStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.PLANNED:
        return <Clock className="h-4 w-4 text-slate-600" />;
      case ActivityStatus.IN_PROGRESS:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case ActivityStatus.COMPLETED:
        return <Check className="h-4 w-4 text-green-600" />;
      case ActivityStatus.CANCELLED:
        return <Ban className="h-4 w-4 text-red-600" />;
      case ActivityStatus.POSTPONED:
        return <CalendarX className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  // Render priority icon
  const renderPriorityIcon = (priority: ActivityPriority) => {
    switch (priority) {
      case ActivityPriority.LOW:
        return null;
      case ActivityPriority.MEDIUM:
        return <ChevronUp className="h-4 w-4 text-blue-600" />;
      case ActivityPriority.HIGH:
        return <ChevronUp className="h-4 w-4 text-amber-600" />;
      case ActivityPriority.URGENT:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Get variant for status badge
  const getStatusBadgeVariant = (status: ActivityStatus): "outline" | "destructive" | "warning" => {
    switch (status) {
      case ActivityStatus.COMPLETED:
        return "outline";
      case ActivityStatus.CANCELLED:
        return "destructive";
      case ActivityStatus.POSTPONED:
        return "warning";
      default:
        return "outline";
    }
  };

  const sortedActivities = getSortedActivities();

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions toolbar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-medium">Lista de Actividades</h2>
          <Badge variant="outline">{activities.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedActivities.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Acciones en lote ({selectedActivities.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones en lote</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange(ActivityStatus.COMPLETED)}
                  className="flex items-center"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marcar como completadas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange(ActivityStatus.CANCELLED)}
                  className="flex items-center"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Marcar como canceladas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange(ActivityStatus.POSTPONED)}
                  className="flex items-center"
                >
                  <CalendarX className="mr-2 h-4 w-4" />
                  Marcar como pospuestas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleBulkDelete}
                  className="text-red-600 flex items-center"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar seleccionadas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Actualizar
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowCreateDialog(true)}>
            Nueva Actividad
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[46px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todas"
                />
              </TableHead>
              <TableHead className="w-[240px]">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort('title')}
                >
                  Actividad
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort('type')}
                >
                  Tipo
                  {sortField === 'type' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Estado
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort('priority')}
                >
                  Prioridad
                  {sortField === 'priority' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort('startDate')}
                >
                  Fecha
                  {sortField === 'startDate' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Relacionado con</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay actividades disponibles
                </TableCell>
              </TableRow>
            ) : (
              sortedActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedActivities.includes(activity.id)}
                      onCheckedChange={(checked) => 
                        handleSelectActivity(activity.id, checked as boolean)
                      }
                      aria-label={`Seleccionar actividad ${activity.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">
                        {activity.title}
                      </span>
                      {activity.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {activity.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {renderTypeIcon(activity.type)}
                      <span className="text-sm">{ACTIVITY_TYPE_LABELS[activity.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(activity.status)} className="flex items-center gap-1.5 w-fit">
                      {renderStatusIcon(activity.status)}
                      <span>{ACTIVITY_STATUS_LABELS[activity.status]}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {renderPriorityIcon(activity.priority)}
                      <span className="text-sm">
                        {ACTIVITY_PRIORITY_LABELS[activity.priority]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {format(new Date(activity.startDate), 'dd/MM/yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.startDate), 'HH:mm')} - {format(new Date(activity.endDate), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {activity.customerName && (
                        <span className="text-sm">
                          Cliente: {activity.customerName}
                        </span>
                      )}
                      {activity.leadName && (
                        <span className="text-sm">
                          Prospecto: {activity.leadName}
                        </span>
                      )}
                      {activity.opportunityName && (
                        <span className="text-sm">
                          Oportunidad: {activity.opportunityName}
                        </span>
                      )}
                      {!activity.customerName && !activity.leadName && !activity.opportunityName && (
                        <span className="text-sm text-muted-foreground">
                          Sin relación
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {activity.userName || 'Sin asignar'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(activity)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {activity.status !== ActivityStatus.COMPLETED && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(activity.id, ActivityStatus.COMPLETED)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Marcar como completada
                          </DropdownMenuItem>
                        )}
                        {activity.status !== ActivityStatus.CANCELLED && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(activity.id, ActivityStatus.CANCELLED)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Marcar como cancelada
                          </DropdownMenuItem>
                        )}
                        {activity.status !== ActivityStatus.POSTPONED && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(activity.id, ActivityStatus.POSTPONED)}
                          >
                            <CalendarX className="mr-2 h-4 w-4" />
                            Marcar como pospuesta
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setActivityToDelete(activity.id);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => activityToDelete && handleDelete(activityToDelete)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create activity dialog */}
      {showCreateDialog && (
        <CreateActivityDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={(activity) => {
            toast.success('Actividad creada correctamente');
            onRefresh();
          }}
          onError={(error) => {
            toast.error(`Error al crear la actividad: ${error}`);
          }}
        />
      )}
    </div>
  );
}