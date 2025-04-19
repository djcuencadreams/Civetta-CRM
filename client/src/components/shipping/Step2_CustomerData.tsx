import { useFormContext } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";

interface Step2CustomerDataProps {
  duplicateErrors?: {
    email?: string;
  };
}

const Step2_CustomerData = ({ duplicateErrors = {} }: Step2CustomerDataProps = {}) => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email *</FormLabel>
          <FormControl>
            <Input 
              {...field} 
              placeholder="Email" 
              type="email" 
              className={duplicateErrors.email ? "border-red-500" : ""}
            />
          </FormControl>
          <FormMessage />
          {duplicateErrors.email && (
            <p className="text-sm font-medium text-red-500 mt-1">
              {duplicateErrors.email}
            </p>
          )}
        </FormItem>
      )}
    />
  );
};

export default Step2_CustomerData;