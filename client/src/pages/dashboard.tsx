
import { CustomerForm } from "@/components/crm/CustomerForm";
import { SalesList } from "@/components/crm/SalesList";
import { CustomerList } from "@/components/crm/CustomerList";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="newCustomer">Nuevo Cliente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Clientes Recientes</h2>
              <CustomerList onSelect={() => {}} />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Ventas Recientes</h2>
              <SalesList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="newCustomer">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Nuevo Cliente</h2>
              <CustomerForm onComplete={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
