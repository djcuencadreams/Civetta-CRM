import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Sale } from "@db/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { es } from "date-fns/locale";

const statusColors = {
  pending: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500"
};

export function SalesList() {
  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"]
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sales?.map((sale) => (
        <Card key={sale.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{sale.customer.name}</h3>
              <Badge variant={
                sale.status === "completed" ? "success" :
                sale.status === "cancelled" ? "destructive" : "default"
              }>
                {t(`sales.${sale.status}`)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              ${sale.amount} - {format(new Date(sale.createdAt), "PPp", { locale: es })}
            </div>
            {sale.notes && (
              <div className="mt-2 text-sm">{sale.notes}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
