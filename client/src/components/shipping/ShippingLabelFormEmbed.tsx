// Este es un archivo wrapper para usar el componente ShippingLabelForm en páginas embed
import { ShippingLabelForm } from "./ShippingLabelForm";

/**
 * Componente para usar el formulario de etiqueta de envío en páginas embed
 * Permite importación con import default
 */
export default function ShippingLabelFormEmbed() {
  return <ShippingLabelForm />;
}