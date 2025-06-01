import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Step1_Form from "./Step1_Form";
import Step2_Form from "./Step2_Form";
import Step3_Form from "./Step3_Form";
import { useShippingForm } from "@/hooks/useShippingForm";
import type { WizardStep } from "@/hooks/useShippingForm";
import '../../styles/stepAnimations.css';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PackageOpenIcon } from "lucide-react";

export function ShippingLabelForm(): JSX.Element {
  const { 
    currentStep, 
    goToNextStep, 
    goToPreviousStep, 
    submitForm, 
    isLoading, 
    isDraftSaved,
    showSuccessModal,
    closeSuccessModal,
    formData
  } = useShippingForm();

  const { toast } = useToast();
  const [progressPercent, setProgressPercent] = useState(25);

  useEffect(() => {
    setProgressPercent(currentStep * 25);
  }, [currentStep]);

  useEffect(() => {
    if (isDraftSaved) {
      toast({
        title: "Borrador guardado",
        description: "Tu progreso ha sido guardado automáticamente",
        variant: "default",
      });
    }
  }, [isDraftSaved, toast]);

  const handleSubmit = async () => {
    const success = await submitForm();
    if (success) {
      toast({
        title: "¡Formulario enviado con éxito!",
        description: "Tu información ha sido procesada correctamente",
        variant: "default",
      });
    } else {
      toast({
        title: "Error al enviar formulario",
        description: "Por favor, verifica los datos e intenta de nuevo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="shipping-label-form">
      <Card className="w-full max-w-4xl mx-auto shadow-lg border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageOpenIcon className="text-primary" />
              <span>Formulario de Envío</span>
            </div>
            <div className="text-sm font-normal text-gray-500">
              Paso {currentStep} de 4
            </div>
          </CardTitle>

          <div className="w-full h-2 bg-gray-200 rounded-full mt-4">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentStep(currentStep)}
            </motion.div>
          </AnimatePresence>

          <Separator className="my-6" />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-1"
            >
              <ChevronLeftIcon size={16} /> Anterior
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => {
                  try {
                    console.log('🖱️ Siguiente button clicked');
                    goToNextStep();
                  } catch (error) {
                    console.error('❌ Error clicking Siguiente:', error);
                    toast({
                      title: "Error",
                      description: `Error al avanzar: ${error.message}`,
                      variant: "destructive",
                    });
                  }
                }}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                Siguiente <ChevronRightIcon size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                Finalizar <CheckIcon size={16} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showSuccessModal} onOpenChange={closeSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Formulario enviado con éxito!</AlertDialogTitle>
            <AlertDialogDescription>
              Gracias por completar el formulario de envío. Hemos recibido tu información y nos pondremos en contacto contigo pronto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderCurrentStep(step: WizardStep): JSX.Element {
  switch (step) {
    case 1:
      return <Step1_Form />;
    case 2:
      return <Step2_Form />;
    case 3:
      return <Step3_Form />;
    case 4:
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Resumen y Confirmación</h3>
          <p className="text-gray-500">Por favor revisa la información antes de enviar:</p>

          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <SummaryItem label="Tipo de Cliente" value="Nuevo Cliente" />
            <SummarySection title="Datos Personales" />
            <SummaryDataFromHook fields={["firstName", "lastName", "document", "email", "phoneNumber"]} />

            <SummarySection title="Dirección de Envío" />
            <SummaryDataFromHook fields={["address", "city", "province", "instructions"]} />
          </div>

          <p className="text-sm text-gray-500">
            Al hacer clic en "Finalizar", confirmas que toda la información proporcionada es correcta.
          </p>
        </div>
      );
    default:
      return <div>Paso inválido</div>;
  }
}

function SummarySection({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1">
      <h4 className="font-medium text-gray-700">{title}</h4>
      <Separator className="my-2" />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SummaryDataFromHook({ fields }: { fields: string[] }) {
  const { formData } = useShippingForm();

  return (
    <div className="space-y-1 pl-2">
      {fields.map(field => {
        const label = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace('First Name', 'Nombre')
          .replace('Last Name', 'Apellido')
          .replace('Phone Number', 'Teléfono')
          .replace('Document', 'Cédula/RUC')
          .replace('Email', 'Correo')
          .replace('Address', 'Dirección')
          .replace('City', 'Ciudad')
          .replace('Province', 'Provincia')
          .replace('Instructions', 'Instrucciones');

        if (formData[field as keyof typeof formData]) {
          return (
            <SummaryItem 
              key={field} 
              label={label} 
              value={formData[field as keyof typeof formData] as string} 
            />
          );
        }
        return null;
      })}
    </div>
  );
}