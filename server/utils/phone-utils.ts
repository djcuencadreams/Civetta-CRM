
import { z } from 'zod';

// Attempt to import libphonenumber-js if available, otherwise use a fallback implementation
let parsePhoneNumberFromString: ((input: string) => any) | undefined;

try {
  const libphonenumber = require('libphonenumber-js');
  parsePhoneNumberFromString = libphonenumber.parsePhoneNumberFromString;
} catch (error) {
  console.warn('Warning: libphonenumber-js not found, using fallback phone validation.');
}

export const phoneSchema = z.object({
  phoneCountry: z.string().min(2),
  phoneNumber: z.string().min(6).max(15)
});

// New function for normalizing phone numbers to E.164 format using libphonenumber-js
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  
  // Try with libphonenumber-js if available
  if (parsePhoneNumberFromString) {
    try {
      const parsed = parsePhoneNumberFromString(raw);
      if (!parsed || !parsed.isValid()) return null;
      return parsed.number; // E.164 format: e.g., +593999999999
    } catch (error) {
      console.error('Error parsing phone number with libphonenumber-js:', error);
      // Fall back to our custom implementation
    }
  }
  
  // Legacy fallback if libphonenumber-js is not available
  const formatted = joinPhoneNumber(extractCountryCode(raw), extractPhoneNumber(raw));
  
  // Ensure the formatted number is valid before returning it
  return isValidPhoneNumber(formatted) ? formatted : null;
}

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
  // Handle empty or undefined inputs to prevent "+undefined" or "+null"
  if (!country && !number) {
    return '';
  }
  
  // Handle empty inputs explicitly
  if (country === '' && number === '') {
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

// Helper function to extract the country code from a phone number
function extractCountryCode(phone: string): string {
  if (!phone) return '+593'; // Default to Ecuador
  
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  if (cleaned.startsWith('+')) {
    return cleaned.substring(0, cleaned.length > 4 ? 4 : 2); // Take up to 3 digits after +
  }
  
  // Default for local Ecuador numbers
  if (cleaned.startsWith('0')) {
    return '+593';
  }
  
  // Try to intelligently guess the country code
  if (cleaned.startsWith('1')) return '+1';     // USA/Canada
  if (cleaned.startsWith('52')) return '+52';   // Mexico
  if (cleaned.startsWith('44')) return '+44';   // UK
  if (cleaned.startsWith('593')) return '+593'; // Ecuador
  
  // Default to Ecuador if we can't determine
  return '+593';
}

// Helper function to extract the phone number without country code
function extractPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Handle numbers that start with +
  if (cleaned.startsWith('+')) {
    const parts = parsePhoneNumber(cleaned);
    return parts.phoneNumber;
  }
  
  // Handle Ecuador local format (starting with 0)
  if (cleaned.startsWith('0')) {
    return cleaned.substring(1);
  }
  
  // For other cases, try to remove common country codes
  if (cleaned.startsWith('593')) return cleaned.substring(3);
  if (cleaned.startsWith('1') && cleaned.length > 6) return cleaned.substring(1);
  if (cleaned.startsWith('52') && cleaned.length > 7) return cleaned.substring(2);
  if (cleaned.startsWith('44') && cleaned.length > 7) return cleaned.substring(2);
  
  // Otherwise, just return the number as is
  return cleaned;
}

// Function to check if a phone number is valid (can be used both in frontend and backend)
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Use libphonenumber-js if available
  if (parsePhoneNumberFromString) {
    try {
      const parsed = parsePhoneNumberFromString(phone);
      return parsed ? parsed.isValid() : false;
    } catch (error) {
      // Fall back to basic validation
    }
  }
  
  // Basic validation: non-empty string with at least 8 digits (after cleaning)
  // Most international phone numbers are between 8 and 15 digits (excluding country code)
  const cleaned = phone.replace(/[^\d]/g, "");
  return cleaned.length >= 8 && cleaned.length <= 15;
}

// Function to build a full phone number from individual parts (used by customer service)
export function buildPhoneNumber({ phoneCountry, phoneNumber }: { 
  phoneCountry?: string; 
  phoneNumber?: string;
}): string | null {
  if (!phoneCountry && !phoneNumber) return null;
  
  const combined = joinPhoneNumber(phoneCountry || '', phoneNumber || '');
  return normalizePhoneNumber(combined);
}
