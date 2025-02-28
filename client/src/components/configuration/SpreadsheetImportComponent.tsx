import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Download, Loader2, CheckCircle, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

// Define imported data types with the updated fields
type ImportedCustomerData = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneCountry?: string;
  phoneNumber?: string;
  street?: string;
  city?: string;
  province?: string;
  deliveryInstructions?: string;
  source?: string;
  brand?: string;
};

type ImportedLeadData = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneCountry?: string;
  phoneNumber?: string;
  status?: string;
  source?: string;
  notes?: string;
  brand?: string;
};

type ImportedSaleData = {
  customerId: number;
  amount: number;
  status?: string;
  date?: string;
  notes?: string;
  brand?: string;
  product?: string;
};

export function SpreadsheetImportComponent() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>("customers");
  const [importSuccess, setImportSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreviewData([]);
      setImportSuccess(false);
    }
  };

  // Process the spreadsheet file
  const processFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);

      const res = await fetch("/api/configuration/spreadsheet/preview", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al procesar el archivo");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data.data);
      toast({ 
        title: "Archivo procesado", 
        description: `Se encontraron ${data.data.length} registros.`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al procesar archivo", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Import the data to CRM
  const importDataMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (!selectedFile) throw new Error("No file selected");

      formData.append('file', selectedFile);
      formData.append('type', importType);

      const res = await fetch("/api/configuration/spreadsheet/import", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Error al importar datos");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Importación completada", 
        description: `Se importaron ${data.count} registros.`
      });
      setImportSuccess(true);
      setPreviewData([]);
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

  // Handle import type change
  const handleImportTypeChange = (value: string) => {
    setImportType(value);
    setPreviewData([]);
  };

  // Process the file
  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({ 
        title: "Error", 
        description: "Por favor, seleccione un archivo primero.",
        variant: "destructive" 
      });
      return;
    }

    processFileMutation.mutate(selectedFile);
  };

  // Import the data
  const handleImportData = async () => {
    if (previewData.length === 0) {
      toast({ 
        title: "Error", 
        description: "No hay datos para importar.",
        variant: "destructive"
      });
      return;
    }

    importDataMutation.mutate();
  };

  // Download sample template - Implementing actual file download
  const handleDownloadSample = () => {
    try {
      // Create sample data based on import type
      let sampleData: any[] = [];
      let filename = "";

      switch (importType) {
        case "customers":
          filename = "plantilla_clientes_ejemplo.xlsx";
          sampleData = [
            {
              firstName: "Juan",
              lastName: "Pérez",
              email: "juanperez@example.com",
              phoneCountry: "+593",
              phoneNumber: "987654321",
              street: "Calle Principal 123",
              city: "Quito",
              province: "Pichincha",
              deliveryInstructions: "Casa blanca con puerta azul",
              source: "Website",
              brand: "sleepwear,bride" // Example of a client who buys both brands
            },
            {
              firstName: "María",
              lastName: "González",
              email: "mariag@example.com",
              phoneCountry: "+593",
              phoneNumber: "912345678",
              street: "Av. Amazonas 456",
              city: "Guayaquil",
              province: "Guayas",
              deliveryInstructions: "Edificio Central, Piso 3",
              source: "Referral",
              brand: "bride"
            }
          ];
          break;
        case "leads":
          filename = "plantilla_leads_ejemplo.xlsx";
          sampleData = [
            {
              firstName: "Carlos",
              lastName: "López",
              email: "carlosl@example.com",
              phoneCountry: "+593",
              phoneNumber: "976543210",
              status: "new",
              source: "Social Media",
              notes: "Interesado en pijamas de seda",
              brand: "sleepwear"
            },
            {
              firstName: "Laura",
              lastName: "Torres",
              email: "laurat@example.com",
              phoneCountry: "+593",
              phoneNumber: "934567890",
              status: "contacted",
              source: "Event",
              notes: "Boda programada para diciembre",
              brand: "bride"
            }
          ];
          break;
        case "sales":
          filename = "plantilla_ventas_ejemplo.xlsx";
          sampleData = [
            {
              customerId: 1,
              amount: 120.50,
              status: "completed",
              date: "2025-02-15",
              notes: "Pago con tarjeta de crédito",
              product: "Pijama de seda azul",
              brand: "sleepwear"
            },
            {
              customerId: 2,
              amount: 350.00,
              status: "pending",
              date: "2025-02-20",
              notes: "Pendiente depósito bancario",
              product: "Vestido de novia modelo Celestial",
              brand: "bride"
            }
          ];
          break;
        default:
          break;
      }

      // Create a worksheet
      const ws = XLSX.utils.json_to_sheet(sampleData);

      // Create a workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

      // Generate the Excel file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Plantilla descargada",
        description: "Se ha descargado la plantilla de ejemplo en formato Excel."
      });
    } catch (error) {
      toast({
        title: "Error al descargar plantilla",
        description: "Ocurrió un error al generar la plantilla de ejemplo.",
        variant: "destructive"
      });
    }
  };

  const getFieldsForImportType = () => {
    switch (importType) {
      case "customers":
        return [
          { name: "firstName", required: true, description: "Nombre del cliente" },
          { name: "lastName", required: true, description: "Apellidos del cliente" },
          { name: "email", required: false, description: "Correo electrónico" },
          { name: "phoneCountry", required: false, description: "Código de país (ej. +593)" },
          { name: "phoneNumber", required: false, description: "Número de teléfono sin código de país" },
          { name: "street", required: false, description: "Calle, Intersección y Número de Casa" },
          { name: "city", required: false, description: "Ciudad" },
          { name: "province", required: false, description: "Provincia" },
          { name: "deliveryInstructions", required: false, description: "Referencia o Instrucciones Especiales para la Entrega" },
          { name: "source", required: false, description: "Origen del cliente (ej. Website, Referral, Social Media)" },
          { name: "brand", required: false, description: "Marca (sleepwear, bride o ambas separadas por coma: sleepwear,bride)" }
        ];
      case "leads":
        return [
          { name: "firstName", required: true, description: "Nombre del prospecto" },
          { name: "lastName", required: true, description: "Apellidos del prospecto" },
          { name: "email", required: false, description: "Correo electrónico" },
          { name: "phoneCountry", required: false, description: "Código de país (ej. +593)" },
          { name: "phoneNumber", required: false, description: "Número de teléfono sin código de país" },
          { name: "status", required: false, description: "Estado (new, contacted, qualified, lost, won)" },
          { name: "source", required: false, description: "Origen del lead" },
          { name: "notes", required: false, description: "Notas adicionales" },
          { name: "brand", required: false, description: "Marca (sleepwear, bride o ambas separadas por coma: sleepwear,bride)" }
        ];
      case "sales":
        return [
          { name: "customerId", required: true, description: "ID del cliente en el CRM" },
          { name: "amount", required: true, description: "Monto de la venta" },
          { name: "status", required: false, description: "Estado (pending, completed, cancelled)" },
          { name: "date", required: false, description: "Fecha de la venta (YYYY-MM-DD)" },
          { name: "notes", required: false, description: "Notas adicionales" },
          { name: "product", required: false, description: "Producto o artículo vendido" },
          { name: "brand", required: false, description: "Marca (sleepwear o bride)" }
        ];
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar datos desde hoja de cálculo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Importa información de clientes, leads o ventas desde archivos CSV o Excel.
        </p>

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import">Importar</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div>
              <Label>Tipo de importación</Label>
              <Select value={importType} onValueChange={handleImportTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione el tipo de datos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Clientes</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file-upload">Seleccionar archivo (CSV o Excel)</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  id="file-upload" 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  onChange={handleFileChange}
                />
                <Button 
                  onClick={handleProcessFile} 
                  disabled={!selectedFile || processFileMutation.isPending}
                >
                  {processFileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : "Verificar"}
                </Button>
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Archivo seleccionado: {selectedFile.name}
                </p>
              )}
            </div>

            {previewData.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Vista previa ({previewData.length} registros):</h3>
                <div className="max-h-60 overflow-auto border rounded-md p-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.slice(0, 5).map((item, index) => (
                        <tr key={index}>
                          {Object.values(item).map((value: any, i) => (
                            <td key={i} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {value !== null && value !== undefined ? String(value) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 5 && (
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Mostrando 5 de {previewData.length} registros
                    </p>
                  )}
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
                  Los datos han sido importados correctamente al CRM.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Estructura de datos</AlertTitle>
              <AlertDescription>
                Descargue una plantilla o utilice la siguiente estructura para preparar sus datos.
                Para clientes que compran ambas marcas (sleepwear y bride), separe las marcas con coma en el campo "brand".
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Campos requeridos para {importType === "customers" ? "Clientes" : importType === "leads" ? "Leads" : "Ventas"}</h3>
                <div className="border rounded-md p-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requerido</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFieldsForImportType().map((field, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {field.required ? "Sí" : "No"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {field.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleDownloadSample} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar plantilla de ejemplo
                </Button>
              </div>

              <Alert>
                <AlertTitle>Consejos de importación</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1 text-sm">
                    <li>Asegúrese de que los campos requeridos estén completos.</li>
                    <li>Para archivos CSV, utilice comas como separador y codificación UTF-8.</li>
                    <li>La primera fila debe contener los nombres de los campos.</li>
                    <li>Para clientes que compran de ambas marcas, separe con coma: "sleepwear,bride".</li>
                    <li>Para fechas, use el formato YYYY-MM-DD.</li>
                    <li>Para importar ventas, el cliente debe existir previamente en el CRM.</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}