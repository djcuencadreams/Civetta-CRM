import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { Button } from "../../components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Loader2, MessageSquare, Mail, Phone, Instagram, Users, FileText } from 'lucide-react';
import { Badge } from "../../components/ui/badge";
import { useToast } from '../../hooks/use-toast';

// Componente para mostrar ícono según el canal
function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case 'email':
      return <Mail className="h-4 w-4 text-blue-500" />;
    case 'phone':
      return <Phone className="h-4 w-4 text-orange-500" />;
    case 'instagram':
      return <Instagram className="h-4 w-4 text-purple-500" />;
    case 'meeting':
      return <Users className="h-4 w-4 text-indigo-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

// Mapa de traducciones para tipos de interacción
const typeLabels: Record<string, string> = {
  'query': 'Consulta',
  'complaint': 'Queja',
  'followup': 'Seguimiento',
  'order': 'Pedido',
  'support': 'Soporte'
};

// Mapa de traducciones para canales
const channelLabels: Record<string, string> = {
  'whatsapp': 'WhatsApp',
  'email': 'Email',
  'phone': 'Teléfono',
  'instagram': 'Instagram',
  'meeting': 'Reunión'
};

// Mapa de colores para tipos de interacción
const typeColors: Record<string, string> = {
  'query': 'bg-blue-100 text-blue-800',
  'complaint': 'bg-red-100 text-red-800',
  'followup': 'bg-green-100 text-green-800',
  'order': 'bg-purple-100 text-purple-800',
  'support': 'bg-orange-100 text-orange-800'
};

interface InteractionsListProps {
  interactions: any[];
  onRefresh: () => void;
}

export function InteractionsList({ interactions, onRefresh }: InteractionsListProps) {
  const { toast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [interactionToDelete, setInteractionToDelete] = useState<number | null>(null);

  // Mutación para eliminar interacción
  const deleteInteraction = useMutation<any, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/interactions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la interacción');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Interacción eliminada',
        description: 'La interacción ha sido eliminada correctamente.',
      });
      onRefresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar la interacción',
        variant: 'destructive',
      });
    },
  });

  // Manejar solicitud de eliminación
  const handleDeleteRequest = (id: number) => {
    setInteractionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Confirmar eliminación
  const confirmDelete = () => {
    if (interactionToDelete !== null) {
      deleteInteraction.mutate(interactionToDelete);
      setDeleteConfirmOpen(false);
    }
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setInteractionToDelete(null);
  };

  // Formatear fecha
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Obtener nombre del contacto
  const getContactName = (interaction: any) => {
    if (interaction.customer) {
      return `${interaction.customer.name} (Cliente)`;
    } else if (interaction.lead) {
      return `${interaction.lead.name} (Lead)`;
    }
    return 'Contacto no especificado';
  };

  if (interactions.length === 0) {
    return <p className="text-center py-4">No hay interacciones que mostrar.</p>;
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        {interactions.map((interaction) => (
          <AccordionItem 
            key={interaction.id} 
            value={interaction.id.toString()}
            className="border rounded-md mb-2 overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
              <div className="flex flex-col md:flex-row md:items-center w-full text-left gap-2">
                <div className="flex items-center gap-2 min-w-[150px]">
                  <ChannelIcon channel={interaction.channel} />
                  <span className="font-medium">
                    {formatDate(interaction.createdAt)}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground block md:inline md:mr-2">
                    {getContactName(interaction)}
                  </span>
                  <Badge className={typeColors[interaction.type] || ''}>
                    {typeLabels[interaction.type] || interaction.type}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-3 space-y-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Detalles de contacto</h4>
                    <p className="mt-1">{getContactName(interaction)}</p>
                    {interaction.customer && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {interaction.customer.email || 'Sin email'} • {interaction.customer.phone || 'Sin teléfono'}
                      </p>
                    )}
                    {interaction.lead && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {interaction.lead.email || 'Sin email'} • {interaction.lead.phone || 'Sin teléfono'}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Información de la interacción</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {channelLabels[interaction.channel] || interaction.channel}
                      </Badge>
                      <Badge className={typeColors[interaction.type] || ''}>
                        {typeLabels[interaction.type] || interaction.type}
                      </Badge>
                    </div>
                    {interaction.assignedUser && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Asignado a: {interaction.assignedUser.fullName || `${interaction.assignedUser.firstName} ${interaction.assignedUser.lastName}`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
                  <div className="mt-1 p-3 bg-white rounded border">
                    <p className="whitespace-pre-wrap">{interaction.content}</p>
                  </div>
                </div>

                {interaction.attachments && interaction.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Adjuntos</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {interaction.attachments.map((attachment: any, index: number) => (
                        <a 
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-2 bg-white rounded border hover:bg-slate-100"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="text-sm">{attachment.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRequest(interaction.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta interacción
              del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deleteInteraction.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}