import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Sale, brandEnum } from "@db/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { es } from "date-fns/locale";
import { getQueryFn } from "@/lib/queryClient";

type SaleWithCustomer = Sale & {
  customer: {
    name: string;
  };
};

const statusVariants = {
  pending: "default",
  completed: "default",
  cancelled: "destructive"
} as const;

export function SalesList({ brand }: { brand?: string }) {
  const { data: sales, isLoading } = useQuery<SaleWithCustomer[]>({
    queryKey: ["/api/sales", brand],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => {
      // Apply brand filter if specified
      if (brand) {
        return data.filter(sale => sale.brand === brand);
      }
      return data;
    }
  });

  // Get brand display name
  const getBrandDisplayName = (brandValue: string | null) => {
    switch(brandValue) {
      case brandEnum.BRIDE: return "Bride";
      case brandEnum.SLEEPWEAR: return "Sleepwear";
      default: return "";
    }
  };

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
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{sale.customer.name}</h3>
                {brand ? null : (
                  <span className="text-xs text-muted-foreground">
                    {getBrandDisplayName(sale.brand)}
                  </span>
                )}
              </div>
              <Badge variant={statusVariants[sale.status as keyof typeof statusVariants]}>
                {t(`sales.${sale.status}`)}
              </Badge>
            </div>
            <div className="space-y-2">
              {sale.notes?.split('\n').map((line, i) => (
                line.startsWith('Notas:') ? null : 
                <div key={i} className="text-sm text-muted-foreground pl-2">
                  {line}
                </div>
              ))}
              <div className="text-sm font-medium">
                Total: ${sale.amount} - {format(new Date(sale.createdAt), "PPp", { locale: es })}
              </div>
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