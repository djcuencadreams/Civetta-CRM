import { CustomerForm } from "@/components/crm/CustomerForm";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">New Customer</h2>
          <CustomerForm onComplete={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}