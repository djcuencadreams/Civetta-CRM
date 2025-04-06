import { ShippingLabelForm } from "@/components/shipping/ShippingLabelForm";

export default function PublicShippingFormPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Etiquetas de Envío</h1>
          <p className="text-muted-foreground mt-2">
            Genere etiquetas de envío para sus productos de Civetta
          </p>
        </div>
        
        <ShippingLabelForm />
        
        <div className="bg-muted p-4 rounded-lg text-sm mt-8">
          <h3 className="font-medium mb-2">Instrucciones:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Complete todos los campos marcados con asterisco (*)</li>
            <li>Asegúrese de que la dirección sea completa y detallada</li>
            <li>Incluya referencias para facilitar la entrega</li>
            <li>La etiqueta se descargará automáticamente como archivo PDF</li>
            <li>Imprima la etiqueta en tamaño A6 o A5 para mejores resultados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}