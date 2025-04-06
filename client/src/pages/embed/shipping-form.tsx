import { ShippingLabelForm } from "@/components/shipping/ShippingLabelForm";

export default function EmbedShippingForm() {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-background">
      <div className="flex flex-col space-y-4">
        <ShippingLabelForm />
        
        <div className="text-xs text-center text-muted-foreground mt-4">
          © Civetta CRM {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}