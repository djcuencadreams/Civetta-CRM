import { useFormContext } from 'react-hook-form';
import { Textarea } from "@/components/ui/textarea";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";

const Step3_ShippingAddress = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="deliveryInstructions"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Referencia o Instrucciones Especiales para la Entrega</FormLabel>
          <FormControl>
            <Textarea 
              {...field} 
              placeholder="Referencias adicionales o instrucciones especiales para la entrega" 
              rows={2} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default Step3_ShippingAddress;