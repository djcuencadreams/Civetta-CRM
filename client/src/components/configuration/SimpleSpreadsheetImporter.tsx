import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateExcelTemplate } from "./TemplateUtils";

export function SimpleSpreadsheetImporter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"customers" | "leads">("customers");
  const [importSuccess, setImportSuccess] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; message: string } | null>(null);
  const { toast } = useToast();

  // Helper function to parse CSV
  function parseCSV(csvText: string) {
    // Detect CSV separator by examining the first few lines
    const sampleLines = csvText.split(/\r?\n/).slice(0, 3).join('\n');
    let separator = ','; // Default separator
    
    // Check if there are more semicolons than commas in the sample
    if ((sampleLines.match(/;/g) || []).length > (sampleLines.match(/,/g) || []).length) {
      separator = ';';
      console.log("Detected semicolon as CSV separator");
    } else {
      console.log("Using comma as CSV separator");
    }
    
    // Split text into lines
    const lines = csvText.split(/\r?\n/);
    
    // Get headers from first line
    const headers = lines[0].split(separator).map(h => h.trim());
    console.log("Headers detected:", headers);
    
    // Process data rows
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(separator);
      const record: Record<string, string> = {};
      
      // Map values to headers
      headers.forEach((header, index) => {
        if (index < values.length) {
          const value = values[index] ? values[index].trim() : '';
          if (value) {
            // Map to appropriate field names
            let fieldName = header;
            
            // Convert header to camelCase and standardize
            if (header.toLowerCase() === 'firstname' || header.toLowerCase() === 'nombre' || 
                header.toLowerCase() === 'nombres') {
              fieldName = 'firstName';
            } else if (header.toLowerCase() === 'lastname' || header.toLowerCase() === 'apellido' || 
                       header.toLowerCase() === 'apellidos') {
              fieldName = 'lastName';
            } else if (header.toLowerCase() === 'email' || header.toLowerCase() === 'correo' || 
                       header.toLowerCase() === 'correo electrónico') {
              fieldName = 'email';
            } else if (header.toLowerCase().includes('phone') || header.toLowerCase().includes('telefono') || 
                       header.toLowerCase().includes('teléfono')) {
              if (header.toLowerCase().includes('country') || header.toLowerCase().includes('país')) {
                fieldName = 'phoneCountry';
              } else {
                fieldName = 'phoneNumber';
              }
            } else if (header.toLowerCase().includes('cedula') || header.toLowerCase().includes('cédula') || 
                       header.toLowerCase().includes('pasaporte') || header.toLowerCase() === 'idnumber') {
              fieldName = 'idNumber';
            } else if (header.toLowerCase() === 'calle' || header.toLowerCase() === 'street' || 
                       header.toLowerCase() === 'dirección' || header.toLowerCase() === 'direccion') {
              fieldName = 'street';
            } else if (header.toLowerCase() === 'ciudad' || header.toLowerCase() === 'city') {
              fieldName = 'city';
            } else if (header.toLowerCase() === 'provincia' || header.toLowerCase() === 'province' || 
                       header.toLowerCase() === 'estado') {
              fieldName = 'province';
            } else if (header.toLowerCase().includes('instrucciones') || 
                       header.toLowerCase().includes('delivery')) {
              fieldName = 'deliveryInstructions';
            } else if (header.toLowerCase() === 'fuente' || header.toLowerCase() === 'source') {
              fieldName = 'source';
            } else if (header.toLowerCase() === 'marca' || header.toLowerCase() === 'brand') {
              fieldName = 'brand';
            } else if (header.toLowerCase() === 'notas' || header.toLowerCase() === 'notes' || 
                       header.toLowerCase() === 'observaciones') {
              fieldName = 'notes';
            }
            
            record[fieldName] = value;
          }
        }
      });
      
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }
    
    console.log("Sample record:", records.length > 0 ? records[0] : "No records found");
    return records;
  }

  // Mutation for processing file directly
  const processFileMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Processing file:", file.name, file.size, file.type);
      
      // For CSV, let's read the file directly on the client
      return new Promise<{ success: boolean; count: number; message: string }>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            if (!event.target || !event.target.result) {
              throw new Error("No se pudo leer el archivo");
            }
            
            const csvContent = event.target.result as string;
            const records = parseCSV(csvContent);
            
            if (records.length === 0) {
              throw new Error("No se encontraron datos en el archivo");
            }
            
            console.log(`Registros leídos: ${records.length}`);
            
            // Send the parsed data directly to avoid file upload issues
            const response = await fetch("/api/configuration/csv/process", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                records,
                type: importType
              }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              console.error("Error processing data:", data);
              throw new Error(data.error || "Error al procesar los datos");
            }
            
            console.log("Import success:", data);
            resolve(data as { success: boolean; count: number; message: string });
          } catch (error: any) {
            console.error("Error reading file:", error);
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error("Error al leer el archivo"));
        };
        
        reader.readAsText(file);
      });
    },
    onSuccess: (data) => {
      setImportSuccess(true);
      setImportResult({
        count: data.count,
        message: data.message
      });
      toast({
        title: "Importación completada",
        description: `Se importaron ${data.count} registros correctamente.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Error processing file:", error);
      toast({
        title: "Error de importación",
        description: error.message || "Hubo un error al procesar el archivo.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportSuccess(false);
      setImportResult(null);
    }
  };

  const handleProcessFile = () => {
    if (selectedFile) {
      processFileMutation.mutate(selectedFile);
    } else {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, seleccione un archivo Excel primero.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSample = () => {
    generateExcelTemplate(importType);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Importador CSV</CardTitle>
        <CardDescription>
          Importe clientes o leads desde un archivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customers" onValueChange={(v) => setImportType(v as "customers" | "leads")}>
          <TabsList className="mb-4">
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
          </TabsList>
          
          <TabsContent value="customers">
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Importe clientes desde un archivo CSV. El archivo debe tener encabezados para:
                FirstName, LastName, Email, PhoneNumber, etc. Soporta separadores por coma (,) o punto y coma (;).
              </p>
              
              <div className="flex items-center justify-between">
                <Button onClick={handleDownloadSample} variant="outline" size="sm">
                  Descargar plantilla
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="leads">
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Importe leads desde un archivo CSV. El archivo debe tener encabezados para:
                FirstName, LastName, Email, PhoneNumber, Status, etc. Soporta separadores por coma (,) o punto y coma (;).
              </p>
              
              <div className="flex items-center justify-between">
                <Button onClick={handleDownloadSample} variant="outline" size="sm">
                  Descargar plantilla
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="file">Archivo CSV</Label>
            <Input 
              id="file" 
              type="file" 
              onChange={handleFileChange} 
              accept=".csv,.xlsx,.xls"
            />
            <p className="text-xs text-gray-500">
              Formatos soportados: .csv (recomendado), .xlsx, .xls
            </p>
          </div>

          {importSuccess && importResult && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>
                {importResult.message}
              </AlertDescription>
            </Alert>
          )}

          {processFileMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {processFileMutation.error instanceof Error 
                  ? processFileMutation.error.message 
                  : "Hubo un error al procesar el archivo."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <p className="text-sm text-muted-foreground">
          {selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : "Ningún archivo seleccionado"}
        </p>
        <Button
          onClick={handleProcessFile}
          disabled={!selectedFile || processFileMutation.isPending}
          size="lg"
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
        >
          {processFileMutation.isPending ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              Procesando...
            </span>
          ) : (
            <span className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              SUBIR E IMPORTAR {importType === "customers" ? "CLIENTES" : "LEADS"}
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}