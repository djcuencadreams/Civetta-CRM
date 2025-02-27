import { useState } from "react";
import { SalesList } from "@/components/crm/SalesList";
import { SalesForm } from "@/components/crm/SalesForm";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SalesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("common.sales")}
        </h1>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("sales.newSale")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesList />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sales.newSale")}</DialogTitle>
          </DialogHeader>
          <SalesForm onComplete={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}