import { useFormContext } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";

const Step2_CustomerData = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email *</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Email" type="email" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default Step2_CustomerData;