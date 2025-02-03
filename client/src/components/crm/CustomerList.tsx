import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Customer } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerList({
  onSelect
}: {
  onSelect: (customer: Customer) => void;
}) {
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

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
              <h3 className="font-medium">{customer.name}</h3>
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
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onSelect(customer)}
            >
              {t("common.edit")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
