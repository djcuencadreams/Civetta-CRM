import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiAdobeacrobatreader } from "react-icons/si";
import { Loader2, CheckCircle, FileText } from "lucide-react";

// Define extracted customer data type
type ExtractedCustomerData = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
};

export function PdfImportComponent() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCustomerData[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const processPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);

      // Use apiRequest with correct content type handling
      const res = await apiRequest("POST", "/api/integrations/pdf/extract", formData, {
        headers: {
          // Remove content-type to let the browser set it with the boundary parameter
          // Browser will automatically set the correct multipart/form-data header
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al procesar el PDF");
      }

      return res.json() as Promise<ExtractedCustomerData[]>;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      toast({ 
        title: "Extracción completada", 
        description: `Se encontraron ${data.length} registros de clientes.`
      });
      setIsExtracting(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al procesar PDF", 
        description: error.message,
        variant: "destructive"
      });
      setIsExtracting(false);
    }
  });

  const importDataMutation = useMutation({
    mutationFn: async (data: ExtractedCustomerData[]) => {
      const res = await apiRequest("POST", "/api/integrations/pdf/import", { customers: data });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al importar clientes");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se importaron ${data.count} registros de clientes.`
      });
      setImportSuccess(true);
      setExtractedData([]);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de importación", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setExtractedData([]);
      setImportSuccess(false);
    }
  };

  // Process the PDF file
  const handleProcessPdf = async () => {
    if (!selectedFile) {
      toast({ 
        title: "Error", 
        description: "Por favor, seleccione un archivo PDF primero.",
        variant: "destructive" 
      });
      return;
    }

    setIsExtracting(true);
    processPdfMutation.mutate(selectedFile);
  };

  // Import the extracted data to CRM
  const handleImportData = async () => {
    if (extractedData.length === 0) {
      toast({ 
        title: "Error", 
        description: "No hay datos para importar.",
        variant: "destructive"
      });
      return;
    }

    importDataMutation.mutate(extractedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SiAdobeacrobatreader className="h-5 w-5" />
          Importar clientes desde PDF
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Importa información de clientes desde archivos PDF recibidos por email.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-upload">Seleccionar archivo PDF</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange}
              />
              <Button 
                onClick={handleProcessPdf} 
                disabled={!selectedFile || isExtracting || processPdfMutation.isPending}
              >
                {isExtracting || processPdfMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Procesar"
                )}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Archivo seleccionado: {selectedFile.name}
              </p>
            )}
          </div>

          {extractedData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Datos encontrados ({extractedData.length}):</h3>
              <div className="max-h-60 overflow-auto border rounded-md p-2">
                {extractedData.map((customer, index) => (
                  <div key={index} className="p-3 border rounded-md mb-2 bg-slate-50">
                    <div className="font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                      {customer.name || 'Cliente sin nombre'}
                    </div>
                    {customer.email && <div className="text-sm">Email: {customer.email}</div>}
                    {customer.phone && <div className="text-sm">Teléfono: {customer.phone}</div>}
                    {customer.address && (
                      <div className="text-sm mt-1">
                        Dirección: {customer.address}
                        {customer.city && `, ${customer.city}`}
                        {customer.state && `, ${customer.state}`}
                        {customer.postalCode && ` ${customer.postalCode}`}
                        {customer.country && `, ${customer.country}`}
                      </div>
                    )}
                    {customer.notes && (
                      <div className="text-sm mt-1 text-slate-600">
                        Notas: {customer.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleImportData} 
                disabled={importDataMutation.isPending}
                className="w-full"
              >
                {importDataMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Importar a CRM"
                )}
              </Button>
            </div>
          )}

          {importSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Importación exitosa</AlertTitle>
              <AlertDescription>
                Los datos de clientes han sido importados correctamente al CRM.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTitle>Consejos de uso</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>El archivo PDF debe contener datos estructurados de clientes.</li>
                <li>Los PDFs con formularios funcionan mejor para la extracción automática.</li>
                <li>Revise los datos extraídos antes de importarlos al CRM.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}