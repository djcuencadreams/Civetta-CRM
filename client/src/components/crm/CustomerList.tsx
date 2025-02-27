import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Customer, brandEnum } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";

// Extended Customer type with optional mode for view/edit
type CustomerWithMode = Customer & {
  mode?: 'view' | 'edit';
};

export function CustomerList({
  onSelect,
  brand
}: {
  onSelect: (customer: CustomerWithMode) => void;
  brand?: string;
}) {
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", brand],
    select: (data) => {
      // Filter customers by name (non-empty) and brand if specified
      let filtered = data?.filter(customer => customer.name?.trim());

      // Apply brand filter if specified
      if (brand) {
        filtered = filtered.filter(customer => customer.brand === brand);
      }

      return filtered;
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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {customers?.map((customer) => (
        <Card key={customer.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <h3 className="font-medium">{customer.name}</h3>
                {brand ? null : (
                  <span className="text-xs text-muted-foreground">
                    {getBrandDisplayName(customer.brand)}
                  </span>
                )}
              </div>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Mail className="h-4 w-4" />
                {customer.email}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                {customer.address}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => onSelect({...customer, mode: 'view'})}
              >
                Ver
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onSelect({...customer, mode: 'edit'})}
              >
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}