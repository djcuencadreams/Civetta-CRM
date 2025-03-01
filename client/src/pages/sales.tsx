import { useState, useEffect } from "react";
import { SalesList } from "@/components/crm/SalesList";
import { SalesForm } from "@/components/crm/SalesForm";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function SalesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
          {t("common.sales")}
        </h1>
        <Button 
          onClick={() => setDialogOpen(true)} 
          className="gap-2"
          size={isMobile ? "sm" : "default"}
        >
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
            <DialogDescription>
              Registre una nueva venta en el sistema
            </DialogDescription>
          </DialogHeader>
          <SalesForm onComplete={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}