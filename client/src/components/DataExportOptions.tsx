import React from 'react';
import { Button } from "@/components/ui/button";
import { DownloadCloud, FileText, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataExportOptionsProps {
  onExport: () => void;
  onCustomExport: () => void;
  onExportAll: () => void;
  disabled?: boolean;
}

/**
 * Componente para opciones de exportación de datos
 */
export function DataExportOptions({ 
  onExport, 
  onCustomExport, 
  onExportAll, 
  disabled = false 
}: DataExportOptionsProps) {
  return (
    <div className="flex space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={disabled}
              className="flex items-center"
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar Informe</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Exportar este informe a Excel</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onCustomExport}
              disabled={disabled}
              className="flex items-center"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportación Personalizada</span>
              <span className="sm:hidden">Personal.</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Personalizar datos a exportar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportAll}
              disabled={disabled}
              className="flex items-center"
            >
              <Database className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar Todos los Datos</span>
              <span className="sm:hidden">Todos</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Exportar base de datos completa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}