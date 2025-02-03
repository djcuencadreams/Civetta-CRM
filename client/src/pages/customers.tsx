import { useState } from "react";
import { CustomerList } from "@/components/crm/CustomerList";
import { CustomerForm } from "@/components/crm/CustomerForm";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Customer } from "@db/schema";
import { Plus } from "lucide-react";

export default function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("common.customers")}
        </h1>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
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
              {selectedCustomer ? t("common.edit") : t("customers.newCustomer")}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={selectedCustomer}
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
