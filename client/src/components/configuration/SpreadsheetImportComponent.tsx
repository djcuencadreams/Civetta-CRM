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
  Info, HelpCircle, ArrowLeft, ArrowRight, Wand2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';
import { generateExcelTemplate } from './TemplateUtils';

// Define imported data types with the updated fields
type ImportedCustomerData = {
  firstName: string;
  lastName: string;
  idNumber?: string; // Cédula/Pasaporte/RUC for invoicing and shipping
  email?: string;
  phoneCountry?: string;
  phoneNumber?: string;
  street?: string;
  city?: string;
  province?: string;
  deliveryInstructions?: string;
  source?: string;
  brand?: string;
  notes?: string;
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
  street?: string;
  city?: string;
  province?: string;
  deliveryInstructions?: string;
};

// Default field mappings for various import types
const defaultCustomerFieldMappings = [
  { sourceField: "Nombres", targetField: "firstName" },
  { sourceField: "Apellidos", targetField: "lastName" },
  { sourceField: "Email", targetField: "email" },
  { sourceField: "País Teléfono", targetField: "phoneCountry" },
  { sourceField: "Número Teléfono", targetField: "phoneNumber" },
  { sourceField: "Calle", targetField: "street" },
  { sourceField: "Ciudad", targetField: "city" },
  { sourceField: "Provincia", targetField: "province" },
  { sourceField: "Instrucciones de Entrega", targetField: "deliveryInstructions" },
  { sourceField: "Fuente", targetField: "source" },
  { sourceField: "Marca", targetField: "brand" },
  { sourceField: "Notas", targetField: "notes" }
];

const defaultLeadFieldMappings = [
  { sourceField: "Nombres", targetField: "firstName" },
  { sourceField: "Apellidos", targetField: "lastName" },
  { sourceField: "Email", targetField: "email" },
  { sourceField: "País Teléfono", targetField: "phoneCountry" },
  { sourceField: "Número Teléfono", targetField: "phoneNumber" },
  { sourceField: "Estado", targetField: "status" },
  { sourceField: "Fuente", targetField: "source" },
  { sourceField: "Notas", targetField: "notes" },
  { sourceField: "Marca", targetField: "brand" },
  { sourceField: "Calle", targetField: "street" },
  { sourceField: "Ciudad", targetField: "city" },
  { sourceField: "Provincia", targetField: "province" },
  { sourceField: "Instrucciones de Entrega", targetField: "deliveryInstructions" }
];

const defaultSaleFieldMappings = [
  { sourceField: "ClienteID", targetField: "customerId" },
  { sourceField: "Monto", targetField: "amount" },
  { sourceField: "Estado", targetField: "status" },
  { sourceField: "Fecha", targetField: "date" },
  { sourceField: "Notas", targetField: "notes" },
  { sourceField: "Marca", targetField: "brand" },
  { sourceField: "Producto", targetField: "product" }
];

// Alternative field names that might appear in imported files
const alternativeFieldNames: Record<string, string[]> = {
  firstName: ["Nombre", "First Name", "First", "Name", "NombreCliente"],
  lastName: ["Apellido", "Last Name", "Last", "Surname", "ApellidoCliente"],
  idNumber: ["Cédula", "Cedula", "Pasaporte", "Cédula/Pasaporte", "ID", "Identificación", "Identificacion", "NúmeroID", "NumeroID", "RUC"],
  email: ["Correo", "Email", "E-mail", "EmailCliente", "CorreoElectrónico"],
  phoneCountry: ["+Pais", "CountryCode", "Código de País", "CódigoPaís"],
  phoneNumber: ["Telefono", "Phone", "Celular", "Mobile", "TelefonoCliente", "NumTelefono"],
  street: ["Dirección", "Address", "Calle", "Domicilio", "DireccionCalle"],
  city: ["Ciudad", "City", "Town", "Localidad", "Pueblo"],
  province: ["Provincia", "State", "Region", "Región", "Estado", "Departamento"],
  deliveryInstructions: ["Instrucciones", "Delivery Notes", "NotasEntrega", "Entrega"],
  source: ["Fuente", "Source", "Origin", "Canal", "Origen"],
  brand: ["Marca", "Brand", "Línea", "Line", "TipoProducto", "Tipo"],
  notes: ["Notas", "Notes", "Comments", "Comentarios", "Observaciones"],
  status: ["Estado", "Status", "Estatus", "Etapa", "Stage"],
  customerId: ["IDCliente", "ClientID", "Customer", "CustomerID", "ID_Cliente"],
  amount: ["Cantidad", "Amount", "Total", "Valor", "Precio", "Price"],
  date: ["Fecha", "Date", "FechaVenta", "SaleDate", "Día"]
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

  // Define default field mappings for import types
  const getDefaultFieldMappings = (type: string) => {
    switch (type) {
      case "customers":
        return [
          { sourceField: "Nombres", targetField: "firstName" },
          { sourceField: "Apellidos", targetField: "lastName" },
          { sourceField: "Email", targetField: "email" },
          { sourceField: "País Teléfono", targetField: "phoneCountry" },
          { sourceField: "Número Teléfono", targetField: "phoneNumber" },
          { sourceField: "Calle", targetField: "street" },
          { sourceField: "Ciudad", targetField: "city" },
          { sourceField: "Provincia", targetField: "province" },
          { sourceField: "Instrucciones de Entrega", targetField: "deliveryInstructions" },
          { sourceField: "Fuente", targetField: "source" },
          { sourceField: "Marca", targetField: "brand" },
          { sourceField: "Notas", targetField: "notes" }
        ];
      case "leads":
        return [
          { sourceField: "Nombres", targetField: "firstName" },
          { sourceField: "Apellidos", targetField: "lastName" },
          { sourceField: "Email", targetField: "email" },
          { sourceField: "País Teléfono", targetField: "phoneCountry" },
          { sourceField: "Número Teléfono", targetField: "phoneNumber" },
          { sourceField: "Estado", targetField: "status" },
          { sourceField: "Fuente", targetField: "source" },
          { sourceField: "Notas", targetField: "notes" },
          { sourceField: "Marca", targetField: "brand" },
          { sourceField: "Calle", targetField: "street" },
          { sourceField: "Ciudad", targetField: "city" },
          { sourceField: "Provincia", targetField: "province" },
          { sourceField: "Instrucciones de Entrega", targetField: "deliveryInstructions" }
        ];
      case "sales":
        return [
          { sourceField: "ClienteID", targetField: "customerId" },
          { sourceField: "Monto", targetField: "amount" },
          { sourceField: "Estado", targetField: "status" },
          { sourceField: "Fecha", targetField: "date" },
          { sourceField: "Notas", targetField: "notes" },
          { sourceField: "Marca", targetField: "brand" },
          { sourceField: "Producto", targetField: "product" }
        ];
      default:
        return [];
    }
  };

  // Define alternative field names that might appear in imported files
  const getAlternativeFieldNames = () => {
    return {
      firstName: ["Nombre", "First Name", "First", "Name", "NombreCliente"],
      lastName: ["Apellido", "Last Name", "Last", "Surname", "ApellidoCliente"],
      email: ["Correo", "Email", "E-mail", "EmailCliente", "CorreoElectrónico"],
      phoneCountry: ["+Pais", "CountryCode", "Código de País", "CódigoPaís"],
      phoneNumber: ["Telefono", "Phone", "Celular", "Mobile", "TelefonoCliente", "NumTelefono"],
      street: ["Dirección", "Address", "Calle", "Domicilio", "DireccionCalle"],
      city: ["Ciudad", "City", "Town", "Localidad", "Pueblo"],
      province: ["Provincia", "State", "Region", "Región", "Estado", "Departamento"],
      deliveryInstructions: ["Instrucciones", "Delivery Notes", "NotasEntrega", "Entrega"],
      source: ["Fuente", "Source", "Origin", "Canal", "Origen"],
      brand: ["Marca", "Brand", "Línea", "Line", "TipoProducto", "Tipo"],
      notes: ["Notas", "Notes", "Comments", "Comentarios", "Observaciones"],
      status: ["Estado", "Status", "Estatus", "Etapa", "Stage"],
      customerId: ["IDCliente", "ClientID", "Customer", "CustomerID", "ID_Cliente"],
      amount: ["Cantidad", "Amount", "Total", "Valor", "Precio", "Price"],
      date: ["Fecha", "Date", "FechaVenta", "SaleDate", "Día"]
    };
  };

  // Function to find a matching field based on alternative names
  const findMatchingTargetField = (headerName: string) => {
    const alternativeNames = getAlternativeFieldNames();
    const normalizedHeader = headerName.toLowerCase().trim();
    
    // Check each target field for a match with its alternative names
    for (const [targetField, alternatives] of Object.entries(alternativeNames)) {
      const lowerCaseAlternatives = alternatives.map(alt => alt.toLowerCase().trim());
      if (lowerCaseAlternatives.includes(normalizedHeader)) {
        return targetField;
      }
    }
    
    return '';
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
        // Try to find matching target field using different strategies
        
        // 1. Direct match (case insensitive)
        const normalizedHeader = header.toLowerCase().trim();
        let matchingField = targetFields.find(field => 
          field.toLowerCase() === normalizedHeader
        );
        
        // 2. If no direct match, try alternative names
        if (!matchingField) {
          matchingField = findMatchingTargetField(header);
        }
        
        // 3. As a last resort, try fuzzy matching by removing special chars
        if (!matchingField) {
          const simplifiedHeader = normalizedHeader.replace(/[^a-z0-9]/g, '');
          matchingField = targetFields.find(field => 
            field.toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedHeader
          );
        }
        
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

  // Auto-map fields based on the import type and header names
  const autoMapFields = () => {
    if (fileHeaders.length === 0) return;
    
    // Get the default mappings for the current import type
    const defaultMappings = getDefaultFieldMappings(importType);
    const alternativeNames = getAlternativeFieldNames();
    
    // Create a new array of mappings
    const newMappings: FieldMapping[] = [];
    
    fileHeaders.forEach(header => {
      // Try exact match with default mappings first
      const exactMatch = defaultMappings.find(mapping => 
        mapping.sourceField.toLowerCase() === header.toLowerCase()
      );
      
      if (exactMatch) {
        newMappings.push({ sourceField: header, targetField: exactMatch.targetField });
        return;
      }
      
      // Try to match using alternative field names
      const normalizedHeader = header.toLowerCase().trim();
      
      // Find if any target field has this header as an alternative name
      let matchFound = false;
      for (const [targetField, alternatives] of Object.entries(alternativeNames)) {
        if (alternatives.some(alt => alt.toLowerCase() === normalizedHeader)) {
          newMappings.push({ sourceField: header, targetField });
          matchFound = true;
          break;
        }
      }
      
      // If no match was found, try fuzzy matching
      if (!matchFound) {
        // Remove special characters and compare
        const simplifiedHeader = normalizedHeader.replace(/[^a-z0-9]/g, '');
        
        for (const [targetField, alternatives] of Object.entries(alternativeNames)) {
          // Try to find a fuzzy match in alternative names
          const fuzzyMatch = alternatives.some(alt => 
            alt.toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedHeader
          );
          
          if (fuzzyMatch) {
            newMappings.push({ sourceField: header, targetField });
            matchFound = true;
            break;
          }
        }
        
        // If still no match, leave it unmapped
        if (!matchFound) {
          newMappings.push({ sourceField: header, targetField: '' });
        }
      }
    });
    
    // Update the field mappings state
    setFieldMappings(newMappings);
    
    // Show a success message
    toast({
      title: "Campos mapeados automáticamente",
      description: "Los campos han sido mapeados según nuestras recomendaciones. Revise y ajuste si es necesario."
    });
  };

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

  // Download sample template - Using the new template generator utility
  const handleDownloadSample = () => {
    try {
      // Use the utility function for template generation
      const success = generateExcelTemplate(importType);
      
      if (!success) {
        toast({
          title: "Error", 
          description: "No se pudo generar la plantilla. Intente de nuevo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al generar plantilla:", error);
      toast({
        title: "Error", 
        description: "Ocurrió un error al generar la plantilla.",
        variant: "destructive"
      });
    }
  };
  
  // Legacy sample data for reference
  /* 
  const createSampleData = () => {
    let sampleData: any[] = [];
    
    switch (importType) {
      case "customers":
        sampleData = [
          {
            firstName: "Juan",
            lastName: "Pérez",
            idNumber: "1701234567",
            email: "juanperez@example.com",
            phoneCountry: "+593",
              "Número Teléfono": "987654321",
              Calle: "Calle Principal 123",
              Ciudad: "Quito",
              Provincia: "Pichincha",
              "Instrucciones de Entrega": "Casa blanca con puerta azul",
              Fuente: "Website",
              Marca: "sleepwear,bride", // Example of a client who buys both brands
              Notas: "Cliente frecuente"
            },
            {
              Nombres: "María",
              Apellidos: "González",
              "Cédula/Pasaporte": "0998765432",
              Email: "mariag@example.com",
              "País Teléfono": "+593",
              "Número Teléfono": "912345678",
              Calle: "Av. Amazonas 456",
              Ciudad: "Guayaquil",
              Provincia: "Guayas",
              "Instrucciones de Entrega": "Edificio Central, Piso 3",
              Fuente: "Referral",
              Marca: "bride",
              Notas: "Solicita envío urgente"
            }
          ];
          break;
        case "leads":
          filename = "plantilla_leads_ejemplo.xlsx";
          sampleData = [
            {
              Nombres: "Carlos",
              Apellidos: "López",
              Email: "carlosl@example.com",
              "País Teléfono": "+593",
              "Número Teléfono": "976543210",
              Estado: "new",
              Fuente: "Social Media",
              Notas: "Interesado en pijamas de seda",
              Marca: "sleepwear",
              Calle: "Calle Quito 345",
              Ciudad: "Cuenca",
              Provincia: "Azuay",
              "Instrucciones de Entrega": "Junto al parque central"
            },
            {
              Nombres: "Laura",
              Apellidos: "Torres",
              Email: "laurat@example.com",
              "País Teléfono": "+593",
              "Número Teléfono": "934567890",
              Estado: "contacted",
              Fuente: "Event",
              Notas: "Boda programada para diciembre",
              Marca: "bride",
              Calle: "Av. 6 de Diciembre",
              Ciudad: "Quito",
              Provincia: "Pichincha",
              "Instrucciones de Entrega": "Edificio Mirador, apto 502"
            }
          ];
          break;
        case "sales":
          filename = "plantilla_ventas_ejemplo.xlsx";
          sampleData = [
            {
              ClienteID: 1,
              Monto: 120.50,
              Estado: "completed",
              Fecha: "2025-02-15",
              Notas: "Pago con tarjeta de crédito",
              Producto: "Pijama de seda azul",
              Marca: "sleepwear"
            },
            {
              ClienteID: 2,
              Monto: 350.00,
              Estado: "pending",
              Fecha: "2025-02-20",
              Notas: "Pendiente depósito bancario",
              Producto: "Vestido de novia modelo Celestial",
              Marca: "bride"
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
            const brandInput = item[mapping.sourceField].toString().toLowerCase();
            let brands = [];
            
            // Handle different input formats
            if (brandInput.includes(',')) {
              // Multiple brands separated by comma
              brands = brandInput.split(',')
                .map((b: string) => b.trim())
                .filter((b: string) => b === 'sleepwear' || b === 'bride');
            } else if (brandInput === 'sleepwear' || brandInput === 'bride') {
              // Single brand
              brands = [brandInput];
            } else if (brandInput.includes('sleep') || brandInput.includes('pijama')) {
              // Fuzzy match for sleepwear
              brands = ['sleepwear'];
            } else if (brandInput.includes('brid') || brandInput.includes('nov')) {
              // Fuzzy match for bride (bride/novia)
              brands = ['bride'];
            } else {
              // Default to sleepwear if no match
              brands = ['sleepwear'];
            }
            
            mappedItem[mapping.targetField] = brands.join(',');
          } 
          // Special handling for phoneCountry to ensure + prefix
          else if (mapping.targetField === 'phoneCountry' && item[mapping.sourceField]) {
            const countryCode = item[mapping.sourceField].toString().trim();
            // Ensure it starts with +
            mappedItem[mapping.targetField] = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
          }
          // Pass other fields as-is
          else {
            mappedItem[mapping.targetField] = item[mapping.sourceField];
          }
        }
      });
      
      // For customer and lead imports, make sure we have proper name handling
      if (importType === 'customers' || importType === 'leads') {
        // If we have firstName and lastName but no full name, create it
        if (mappedItem.firstName && mappedItem.lastName && !mappedItem.name) {
          mappedItem.name = `${mappedItem.firstName} ${mappedItem.lastName}`;
        }
        // If we have full name but no firstName/lastName, try to split it
        else if (mappedItem.name && (!mappedItem.firstName || !mappedItem.lastName)) {
          const nameParts = mappedItem.name.split(' ');
          if (nameParts.length > 1) {
            if (!mappedItem.firstName) mappedItem.firstName = nameParts[0];
            if (!mappedItem.lastName) mappedItem.lastName = nameParts.slice(1).join(' ');
          } else if (!mappedItem.firstName) {
            mappedItem.firstName = mappedItem.name;
            if (!mappedItem.lastName) mappedItem.lastName = '(sin apellido)';
          }
        }
      }
      
      return mappedItem;
    });
  };

  const getFieldsForImportType = () => {
    switch (importType) {
      case "customers":
        return [
          { name: "firstName", required: true, description: "Nombre del cliente" },
          { name: "lastName", required: true, description: "Apellidos del cliente" },
          { name: "idNumber", required: false, description: "Número de Cédula, Pasaporte o RUC" },
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
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={handlePreviousStep}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Atrás
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={autoMapFields}
                          className="flex items-center gap-2"
                        >
                          <Wand2 className="h-4 w-4" />
                          Auto-mapear
                        </Button>
                      </div>
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
            
            {/* Success message */}
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