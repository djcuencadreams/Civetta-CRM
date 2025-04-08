
import { z } from 'zod';

export const phoneSchema = z.object({
  phoneCountry: z.string().min(2).startsWith('+'),
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
        phoneCountry: '+593', // Ecuador default
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
  const phoneCountry = country.startsWith('+') ? country : `+${country}`;
  const phoneNumber = number.replace(/[^\d]/g, "");
  
  try {
    // Validate using schema
    phoneSchema.parse({ phoneCountry, phoneNumber });
    return `${phoneCountry}${phoneNumber}`;
  } catch (error) {
    console.error('Invalid phone number format:', error);
    return `${phoneCountry}${phoneNumber}`; // Return anyway but logged error
  }
}
