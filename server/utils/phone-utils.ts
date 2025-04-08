
import { z } from 'zod';

export const phoneSchema = z.object({
  phoneCountry: z.string().min(2),
  phoneNumber: z.string().min(6).max(15)
});

export function parsePhoneNumber(fullNumber: string): {
  phoneCountry: string;
  phoneNumber: string;
} {
  // Remove all non-digit characters except '+'
  const cleaned = fullNumber.replace(/[^\d+]/g, "");
  
  // Handle numbers that already include '+'
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    const match = withoutPlus.match(/^(\d{1,4})(\d{6,15})$/);
    if (!match) {
      return {
        phoneCountry: '+593',
        phoneNumber: withoutPlus,
      };
    }
    return {
      phoneCountry: `+${match[1]}`,
      phoneNumber: match[2],
    };
  }

  // Handle numbers without '+'
  const match = cleaned.match(/^(\d{1,4})(\d{6,15})$/);
  if (!match) {
    return {
      phoneCountry: '+593',
      phoneNumber: cleaned,
    };
  }

  return {
    phoneCountry: `+${match[1]}`,
    phoneNumber: match[2],
  };
}

export function joinPhoneNumber(country: string, number: string): string {
  // Remove any existing + and clean the inputs
  const cleanCountry = country.replace(/[^\d]/g, "");
  const cleanNumber = number.replace(/[^\d]/g, "");
  
  // Always prefix with + 
  return `+${cleanCountry}${cleanNumber}`;
}
