import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileSpreadsheet, Download, Loader2, CheckCircle, 
  Info, HelpCircle, ArrowLeft, ArrowRight 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
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

// Define field mapping type
type FieldMapping = {
  sourceField: string;
  targetField: string;
};

export function SpreadsheetImportComponent() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>("customers");
  const [importSuccess, setImportSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showMappingInterface, setShowMappingInterface] = useState<boolean>(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreviewData([]);
      setImportSuccess(false);
    }
  };

  // Effect to handle field mapping when preview data changes
  useEffect(() => {
    if (previewData.length > 0) {
      // Extract headers from the first data item
      const headers = Object.keys(previewData[0]);
      setFileHeaders(headers);
      
      // Generate initial field mappings - try to match by name
      const targetFields = getFieldsForImportType().map(field => field.name);
      const initialMappings: FieldMapping[] = [];
      
      headers.forEach(header => {
        // Try to find matching target field (case insensitive)
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchingField = targetFields.find(field => 
          field.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedHeader
        );
        
        initialMappings.push({
          sourceField: header,
          targetField: matchingField || '' // Empty if no match found
        });
      });
      
      setFieldMappings(initialMappings);
      setShowMappingInterface(true);
    } else {
      setFileHeaders([]);
      setFieldMappings([]);
      setShowMappingInterface(false);
    }
  }, [previewData]);

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
      setCurrentStep(2); // Move to mapping step
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

  // Import the data to CRM with field mappings
  const importDataMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (!selectedFile) throw new Error("No file selected");

      // Apply field mappings to the preview data
      const mappedData = applyMappings(previewData);
      
      formData.append('file', selectedFile);
      formData.append('type', importType);
      formData.append('mappedData', JSON.stringify(mappedData));
      formData.append('mappings', JSON.stringify(fieldMappings));

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
      setCurrentStep(4); // Move to success step
      setPreviewData([]);
      setSelectedFile(null);
      setShowMappingInterface(false);
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

  // Download sample template - Implementing actual file download with browser-friendly approach
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

      // Generate the Excel file as array buffer
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Convert array buffer to blob
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Plantilla descargada",
        description: "Se ha descargado la plantilla de ejemplo en formato Excel."
      });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error al descargar plantilla",
        description: "Ocurrió un error al generar la plantilla de ejemplo.",
        variant: "destructive"
      });
    }
  };

  // Update field mapping
  const handleFieldMappingChange = (sourceField: string, targetField: string) => {
    setFieldMappings(prev => 
      prev.map(mapping => 
        mapping.sourceField === sourceField 
          ? { ...mapping, targetField } 
          : mapping
      )
    );
  };

  // Handle step changes
  const handleNextStep = () => {
    if (currentStep === 2) {
      // Validate mappings before going to the final step
      const requiredFields = getFieldsForImportType()
        .filter(field => field.required)
        .map(field => field.name);
      
      const mappedRequiredFields = fieldMappings
        .filter(mapping => mapping.targetField !== '' && requiredFields.includes(mapping.targetField))
        .map(mapping => mapping.targetField);
      
      // Check if all required fields are mapped
      const missingRequiredFields = requiredFields.filter(field => !mappedRequiredFields.includes(field));
      
      if (missingRequiredFields.length > 0) {
        toast({
          title: "Error en mapeo de campos",
          description: `Faltan campos requeridos: ${missingRequiredFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      setCurrentStep(3);
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Prepare data for import using mappings
  const applyMappings = (data: any[]): any[] => {
    return data.map(item => {
      const mappedItem: Record<string, any> = {};
      
      fieldMappings.forEach(mapping => {
        if (mapping.targetField && mapping.sourceField) {
          // Special handling for brand field to support comma-separated values
          if (mapping.targetField === 'brand' && item[mapping.sourceField]) {
            // Ensure brands are normalized (lowercase, trimmed)
            const brands = item[mapping.sourceField].toString().split(',')
              .map((b: string) => b.trim().toLowerCase())
              .filter((b: string) => b === 'sleepwear' || b === 'bride');
            
            mappedItem[mapping.targetField] = brands.join(',');
          } else {
            mappedItem[mapping.targetField] = item[mapping.sourceField];
          }
        }
      });
      
      return mappedItem;
    });
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

                {/* Field Mapping UI - Show in Step 2 */}
                {showMappingInterface && currentStep === 2 && (
                  <div className="space-y-4 bg-muted/20 p-4 rounded-md border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Mapeo de Columnas</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Asigne cada columna de su archivo a un campo en el CRM. Las columnas marcadas como 'Requerido' deben ser asignadas.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="overflow-auto max-h-60 border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo en Archivo</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo en CRM</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {fieldMappings.map((mapping, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {mapping.sourceField}
                              </td>
                              <td className="px-3 py-2">
                                <Select 
                                  value={mapping.targetField} 
                                  onValueChange={(value) => handleFieldMappingChange(mapping.sourceField, value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar campo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No importar</SelectItem>
                                    {getFieldsForImportType().map((field) => (
                                      <SelectItem key={field.name} value={field.name}>
                                        <div className="flex items-center">
                                          {field.name}
                                          {field.required && (
                                            <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <Button 
                        variant="outline" 
                        onClick={handlePreviousStep}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                      </Button>
                      <Button 
                        onClick={handleNextStep}
                        className="flex items-center gap-2"
                      >
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Confirmation and Import Step - Show in Step 3 */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTitle>Confirmar Importación</AlertTitle>
                      <AlertDescription>
                        Está a punto de importar {previewData.length} registros al CRM.
                        Asegúrese de que el mapeo de campos es correcto antes de continuar.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={handlePreviousStep}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Mapeo
                      </Button>
                      <Button 
                        onClick={handleImportData} 
                        disabled={importDataMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {importDataMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            Importar a CRM
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Simple import button for Step 1 - for backward compatibility */}
                {currentStep === 1 && (
                  <Button 
                    onClick={handleProcessFile} 
                    disabled={!selectedFile || processFileMutation.isPending}
                    className="w-full"
                  >
                    {processFileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Verificar y Continuar"
                    )}
                  </Button>
                )}
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