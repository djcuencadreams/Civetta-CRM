
import { useState } from "react";
import { LeadsList } from "@/components/crm/LeadsList";
import { LeadForm } from "@/components/crm/LeadForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function LeadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      <LeadsList 
        onSelect={(lead) => {
          if (lead?.id) {
            setSelectedLead({...lead});
            setDialogOpen(true);
          }
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
              setSelectedLead(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
