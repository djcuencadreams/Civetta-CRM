import { useState, useEffect } from "react";
import { CustomerList } from "@/components/crm/CustomerList";
import { CustomerForm } from "@/components/crm/CustomerForm";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Customer } from "@db/schema";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

export default function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
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
          {t("common.customers")}
        </h1>
        <Button 
          onClick={() => setDialogOpen(true)} 
          className="gap-2"
          size={isMobile ? "sm" : "default"}
        >
          <Plus className="h-4 w-4" />
          {t("customers.newCustomer")}
        </Button>
      </div>

      <CustomerList 
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setDialogOpen(true);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? (
                selectedCustomer.mode === 'edit' ? "Editar Cliente" : "Detalles del Cliente"
              ) : t("customers.newCustomer")}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer ? (
                selectedCustomer.mode === 'edit' ? 
                "Modifique la información del cliente" : 
                "Información detallada del cliente"
              ) : "Ingrese la información del nuevo cliente"}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customerId={selectedCustomer?.id}
            initialMode={selectedCustomer?.mode || 'view'}
            onComplete={() => {
              setDialogOpen(false);
              setSelectedCustomer(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}