import { useFormContext } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import Step2_CustomerData from './Step2_CustomerData';

const Step2_Form = () => {
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombres *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nombres" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apellidos *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Apellidos" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FormField
          control={control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cédula/Pasaporte/RUC *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Documento de identidad" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono *</FormLabel>
              <FormControl>
                <PhoneInput
                  {...field}
                  international
                  defaultCountry="EC"
                  placeholder="Ej. 0999999999"
                  onChange={(value) => field.onChange(value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {/* Uso del componente separado Step2_CustomerData para el email */}
      <Step2_CustomerData />
    </div>
  );
};

export default Step2_Form;