import { z } from 'zod';

export const phoneSchema = z.object({
  phoneCountry: z.string().min(2),
  phoneNumber: z.string().min(6).max(15)
});

/**
 * Normalizes a phone number string by ensuring consistent formatting.
 * Removes duplicate '+' symbols and other non-digit characters.
 * 
 * @param phone String to normalize
 * @returns Normalized phone string with single '+' prefix if applicable
 */
export function normalizePhoneString(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Replace multiple '+' with a single '+'
  let normalized = phone.replace(/\++/g, '+');
  
  // Remove all non-digit characters except the leading '+'
  if (normalized.startsWith('+')) {
    normalized = '+' + normalized.substring(1).replace(/[^\d]/g, '');
  } else {
    normalized = normalized.replace(/[^\d]/g, '');
  }
  
  return normalized;
}

/**
 * Parses a full phone number into country code and local number components.
 * This function ensures consistent parsing regardless of format.
 * 
 * @param fullNumber The full phone number to parse
 * @returns Object with phoneCountry and phoneNumber properties
 */
export function parsePhoneNumber(fullNumber: string | null | undefined): {
  phoneCountry: string;
  phoneNumber: string;
} {
  // Handle empty input
  if (!fullNumber) {
    return {
      phoneCountry: '+593',
      phoneNumber: '',
    };
  }
  
  // Normalize the input first
  const cleaned = normalizePhoneString(fullNumber);
  if (!cleaned) {
    return {
      phoneCountry: '+593',
      phoneNumber: '',
    };
  }
  
  // Standard country codes for Ecuador (default), USA, and common countries
  const commonCountryCodes = ['1', '44', '34', '52', '57', '593', '54', '56'];
  
  // Handle numbers that include '+'
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    
    // Try to match country code patterns (1-3 digits for country code)
    for (let i = 3; i >= 1; i--) {
      if (i <= withoutPlus.length) {
        const countryCode = withoutPlus.substring(0, i);
        // Prefer known country codes if they match
        if (commonCountryCodes.includes(countryCode) || i === 3) {
          return {
            phoneCountry: `+${countryCode}`,
            phoneNumber: withoutPlus.substring(i),
          };
        }
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
    if (i <= cleaned.length) {
      const countryCode = cleaned.substring(0, i);
      // Prefer known country codes if they match
      if (commonCountryCodes.includes(countryCode) || i === 3) {
        return {
          phoneCountry: `+${countryCode}`,
          phoneNumber: cleaned.substring(i),
        };
      }
    }
  }
  
  // If the number is too short to extract a country code, use default
  if (cleaned.length < 4) {
    return {
      phoneCountry: '+593',
      phoneNumber: cleaned,
    };
  }
  
  // Default fallback - assume Ecuador (+593) and the whole number is local
  return {
    phoneCountry: '+593',
    phoneNumber: cleaned,
  };
}

/**
 * Joins country code and phone number into a single, well-formatted phone string.
 * Ensures a single '+' prefix and removes any non-digit characters.
 * 
 * @param country Country code part (with or without '+')
 * @param number Local phone number part
 * @returns Properly formatted full phone number
 */
export function joinPhoneNumber(country: string | null | undefined, number: string | null | undefined): string {
  // Handle empty inputs
  if (!country && !number) return '';
  if ((country === '' || !country) && (number === '' || !number)) return '';
  
  // Default to Ecuador code if missing
  const countryInput = country || '+593';
  const numberInput = number || '';
  
  // Clean and normalize both parts
  const cleanCountry = normalizePhoneString(countryInput);
  const cleanNumber = numberInput.replace(/[^\d]/g, "");
  
  // Exit if both parts are empty after cleaning
  if (!cleanCountry && !cleanNumber) return '';
  
  // Extract just the digits from country code if it has a + prefix
  const countryDigits = cleanCountry.startsWith('+') 
    ? cleanCountry.substring(1) 
    : cleanCountry;
  
  // Return properly formatted number with single + prefix
  return `+${countryDigits}${cleanNumber}`;
}

/**
 * Verifies if phone fields (country and number) are properly synchronized with
 * the full phone field. If not, returns corrected values.
 * 
 * @param phone Full phone number
 * @param phoneCountry Country code 
 * @param phoneNumber Local number
 * @returns Object with corrected values
 */
export function synchronizePhoneFields(
  phone: string | null | undefined,
  phoneCountry: string | null | undefined,
  phoneNumber: string | null | undefined
): {
  phone: string;
  phoneCountry: string;
  phoneNumber: string;
} {
  // If we have both phoneCountry and phoneNumber, use them as source of truth
  if (phoneCountry && phoneNumber) {
    const fullPhone = joinPhoneNumber(phoneCountry, phoneNumber);
    return {
      phone: fullPhone,
      phoneCountry: parsePhoneNumber(fullPhone).phoneCountry,
      phoneNumber: parsePhoneNumber(fullPhone).phoneNumber
    };
  }
  
  // If we only have the full phone, parse it
  if (phone && (!phoneCountry || !phoneNumber)) {
    const parsed = parsePhoneNumber(phone);
    return {
      phone: joinPhoneNumber(parsed.phoneCountry, parsed.phoneNumber),
      phoneCountry: parsed.phoneCountry,
      phoneNumber: parsed.phoneNumber
    };
  }
  
  // Default case - empty values
  return {
    phone: '',
    phoneCountry: '+593',
    phoneNumber: ''
  };
}