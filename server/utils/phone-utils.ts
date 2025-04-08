
import { z } from 'zod';

export const phoneSchema = z.object({
  phoneCountry: z.string().min(2),
  phoneNumber: z.string().min(6).max(15)
});

export function parsePhoneNumber(fullNumber: string): {
  phoneCountry: string;
  phoneNumber: string;
} {
  // Handle empty or undefined input
  if (!fullNumber) {
    return {
      phoneCountry: '+593',
      phoneNumber: '',
    };
  }
  
  // Remove all non-digit characters except '+'
  const cleaned = fullNumber.replace(/[^\d+]/g, "");
  
  // Standard country codes for Ecuador (default), USA, and common countries
  const commonCountryCodes = ['1', '44', '34', '52', '57', '593', '54', '56'];
  
  // Handle numbers that already include '+'
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    
    // Try to match country code patterns (1-3 digits for country code)
    for (let i = 3; i >= 1; i--) {
      const countryCode = withoutPlus.substring(0, i);
      // Prefer known country codes if they match
      if (commonCountryCodes.includes(countryCode) || i === 3) {
        return {
          phoneCountry: `+${countryCode}`,
          phoneNumber: withoutPlus.substring(i),
        };
      }
    }
    
    // Default fallback
    return {
      phoneCountry: '+593',
      phoneNumber: withoutPlus,
    };
  }

  // Handle numbers without '+'
  // Try to match country code patterns (1-3 digits for country code)
  for (let i = 3; i >= 1; i--) {
    const countryCode = cleaned.substring(0, i);
    // Prefer known country codes if they match
    if (commonCountryCodes.includes(countryCode) || i === 3) {
      return {
        phoneCountry: `+${countryCode}`,
        phoneNumber: cleaned.substring(i),
      };
    }
  }
  
  // Default fallback
  return {
    phoneCountry: '+593',
    phoneNumber: cleaned,
  };
}

export function joinPhoneNumber(country: string, number: string): string {
  // Handle empty values to prevent "+undefined" or "+null"
  if (!country && !number) {
    return '';
  }
  
  // Handle missing parts with defaults
  const countryInput = country || '593';
  const numberInput = number || '';
  
  // Check if country already has + and remove it to avoid duplicate + symbols
  const cleanCountry = countryInput.startsWith('+') 
    ? countryInput.substring(1).replace(/[^\d]/g, "") 
    : countryInput.replace(/[^\d]/g, "");
  const cleanNumber = numberInput.replace(/[^\d]/g, "");
  
  // Return empty string if both parts are empty after cleaning
  if (!cleanCountry && !cleanNumber) {
    return '';
  }
  
  // Always prefix with single + 
  return `+${cleanCountry}${cleanNumber}`;
}
