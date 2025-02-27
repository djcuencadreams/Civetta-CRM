import { useState, useEffect } from "react";
import { LeadsList } from "@/components/crm/LeadsList";
import { LeadForm } from "@/components/crm/LeadForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { type Lead } from "@db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

export default function LeadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  const isMobile = useIsMobile();
  const [location] = useLocation();

  // Check for new=true parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    if (searchParams.get('new') === 'true') {
      setDialogOpen(true);
    }
  }, [location]);

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isMobile ? 'flex-col space-y-4 justify-center' : 'justify-between'}`}>
        <h1 className={`text-2xl font-bold tracking-tight ${isMobile ? 'text-center' : ''}`}>
          Leads
        </h1>
        <Button 
          onClick={() => setDialogOpen(true)} 
          className="gap-2"
          size={isMobile ? "sm" : "default"}
        >
          <Plus className="h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      <LeadsList 
        onSelect={(lead) => {
          setSelectedLead(lead);
          setDialogOpen(true);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLead ? "Editar Lead" : "Nuevo Lead"}
            </DialogTitle>
          </DialogHeader>
          <LeadForm
            lead={selectedLead}
            onClose={() => {
              setDialogOpen(false);
              setSelectedLead(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}