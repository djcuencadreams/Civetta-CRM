
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

/**
 * Normalizes a phone number to the E.164 international format
 * E.164 format example: +593995815652
 * 
 * This function handles various input formats:
 * - With or without country code
 * - With or without + prefix
 * - With or without spaces, dashes, or parentheses
 * - With or without leading zero (for countries like Ecuador where mobile numbers start with 0)
 * 
 * @param raw - Raw phone number input in any format
 * @returns Normalized E.164 phone number or null if invalid
 */
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  
  // Remove all whitespace, dashes, parentheses
  const cleanedInput = raw.trim().replace(/[\s\-\(\)\.]/g, '');
  
  // If input is too short, it's definitely invalid
  if (cleanedInput.length < 5) return null;
  
  // Try with libphonenumber-js if available (most accurate)
  if (parsePhoneNumberFromString) {
    try {
      // For Ecuador numbers that start with 0, try adding country code
      let numberToTry = cleanedInput;
      if (cleanedInput.startsWith('0') && !cleanedInput.startsWith('+') && !cleanedInput.startsWith('00')) {
        // Try with Ecuador country code if it looks like a local Ecuador number
        numberToTry = '+593' + cleanedInput.substring(1);
      }
      
      const parsed = parsePhoneNumberFromString(numberToTry);
      if (parsed && parsed.isValid()) {
        return parsed.format('E.164'); // E.164 format: e.g., +593999999999
      }
      
      // If the modified number didn't work, try the original
      if (numberToTry !== cleanedInput) {
        const originalParsed = parsePhoneNumberFromString(cleanedInput);
        if (originalParsed && originalParsed.isValid()) {
          return originalParsed.format('E.164');
        }
      }
      
      // Fall back to custom implementation
    } catch (error) {
      console.warn('Error parsing phone number with libphonenumber-js:', error);
      // Continue to fallback implementation
    }
  }
  
  // Custom implementation fallback
  let formatted: string;
  
  // Handle common international prefixes
  if (cleanedInput.startsWith('00')) {
    // International prefix "00" - replace with +
    formatted = '+' + cleanedInput.substring(2);
  } else if (cleanedInput.startsWith('+')) {
    // Already has + prefix
    formatted = cleanedInput;
  } else if (cleanedInput.startsWith('0')) {
    // For numbers starting with 0 (common in Ecuador, Mexico, etc.)
    // Assume it's an Ecuador number (default country) unless we have evidence otherwise
    formatted = '+593' + cleanedInput.substring(1);
  } else if (/^[1-9]\d{9,14}$/.test(cleanedInput)) {
    // Number without + but starts with a digit 1-9 and has 10-15 digits total
    // This is likely a full international number without the + prefix
    
    // Try to extract country code intelligently
    const { phoneCountry, phoneNumber } = parsePhoneNumber(cleanedInput);
    formatted = phoneCountry + phoneNumber;
  } else {
    // For all other formats, use our general parsing function
    formatted = joinPhoneNumber(extractCountryCode(cleanedInput), extractPhoneNumber(cleanedInput));
  }
  
  // Ensure the formatted number is valid before returning it
  // This creates a cleaner database by rejecting clearly invalid numbers
  if (!isValidPhoneNumber(formatted)) {
    return null;
  }
  
  return formatted;
}

/**
 * Parses a phone number string into country code and national number components
 * Implements robust parsing logic based on E.164 standard
 * 
 * @param fullNumber - Phone number to parse (can be in various formats)
 * @returns Object with phoneCountry (country code with +) and phoneNumber (national number)
 */
export function parsePhoneNumber(fullNumber: string): {
  phoneCountry: string;
  phoneNumber: string;
} {
  // Handle empty or undefined input
  if (!fullNumber) {
    return {
      phoneCountry: '+593', // Default to Ecuador
      phoneNumber: '',
    };
  }
  
  // Remove all non-digit characters except '+'
  const cleaned = fullNumber.replace(/[^\d+]/g, "");
  
  if (cleaned.length < 5) {
    // Too short to be a valid international phone number
    return {
      phoneCountry: '+593', // Default to Ecuador
      phoneNumber: cleaned,
    };
  }
  
  // Define country codes with more specific prioritization
  // Order matters - we check longer codes first to avoid ambiguity
  const countryCodes = [
    // Latin America
    '593', // Ecuador
    '591', // Bolivia
    '57', // Colombia
    '56', // Chile
    '51', // Peru
    '54', // Argentina
    '52', // Mexico
    '58', // Venezuela
    '55', // Brazil
    '507', // Panama
    '506', // Costa Rica
    '504', // Honduras
    // North America
    '1', // USA/Canada
    // Europe
    '44', // UK
    '49', // Germany
    '34', // Spain
    '33', // France
    '39', // Italy
    // Others
    '7', // Russia
    '86', // China
    '81', // Japan
    '82', // South Korea
  ];
  
  // Handle numbers that already include '+'
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    
    // Special handling for numbers starting with double zero (international prefix)
    if (withoutPlus.startsWith('00')) {
      return parsePhoneNumber(withoutPlus.substring(2));
    }
    
    // Match against known country codes, prioritizing longer codes
    for (const code of countryCodes) {
      if (withoutPlus.startsWith(code)) {
        return {
          phoneCountry: `+${code}`,
          phoneNumber: withoutPlus.substring(code.length),
        };
      }
    }
    
    // If we can't match a specific country code, try a generic approach
    // Most country codes are 1-3 digits
    for (let i = 3; i >= 1; i--) {
      if (withoutPlus.length > i + 4) { // Ensure we have enough digits for a valid number
        return {
          phoneCountry: `+${withoutPlus.substring(0, i)}`,
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

  // Handle numbers without '+' prefix
  
  // Special case for Ecuador: numbers starting with 0 are domestic (strip the 0)
  if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 9)) {
    return {
      phoneCountry: '+593',
      phoneNumber: cleaned.substring(1),
    };
  }
  
  // Special handling for numbers starting with double zero (international prefix)
  if (cleaned.startsWith('00')) {
    return parsePhoneNumber(cleaned.substring(2));
  }
  
  // Try to match known country codes
  for (const code of countryCodes) {
    if (cleaned.startsWith(code)) {
      // For numbers with explicitly entered country codes (without + prefix)
      return {
        phoneCountry: `+${code}`,
        phoneNumber: cleaned.substring(code.length),
      };
    }
  }
  
  // If number looks like a full international number (>= 10 digits) but doesn't match known codes,
  // try a generic approach assuming 1-3 digit country code
  if (cleaned.length >= 10) {
    for (let i = 3; i >= 1; i--) {
      if (cleaned.length > i + 5) { // Ensure we have enough digits remaining
        return {
          phoneCountry: `+${cleaned.substring(0, i)}`,
          phoneNumber: cleaned.substring(i),
        };
      }
    }
  }
  
  // Default: assume it's an Ecuador number without country code
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

/**
 * Validates a phone number against E.164 standard and country-specific rules
 * Provides robust validation even without external libraries
 * 
 * @param phone - Phone number to validate (can be any format)
 * @returns true if the phone number is valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Use libphonenumber-js if available (preferred method)
  if (parsePhoneNumberFromString) {
    try {
      const parsed = parsePhoneNumberFromString(phone);
      return parsed ? parsed.isValid() : false;
    } catch (error) {
      // Fall back to custom validation
      console.warn('Error using libphonenumber-js for validation, using fallback:', error);
    }
  }
  
  // Clean the input, removing everything except digits and '+'
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Too short or too long
  if (cleaned.length < 8 || cleaned.length > 15) {
    return false;
  }
  
  // E.164 validation: Must start with + followed by country code and national number
  if (cleaned.startsWith('+')) {
    // Get the parts using our robust parser
    const { phoneCountry, phoneNumber } = parsePhoneNumber(cleaned);
    
    // Country code must be 1-3 digits after +
    const countryCodeDigits = phoneCountry.replace(/\D/g, '');
    if (countryCodeDigits.length < 1 || countryCodeDigits.length > 3) {
      return false;
    }
    
    // National number must be reasonable length (5-12 digits typically)
    const nationalNumberDigits = phoneNumber.replace(/\D/g, '');
    if (nationalNumberDigits.length < 5 || nationalNumberDigits.length > 12) {
      return false;
    }
    
    // Country-specific validation for common countries
    if (phoneCountry === '+593') { // Ecuador
      // Ecuador mobile numbers are 9 digits after country code
      // Ecuador landline numbers are 8 digits after country code
      return nationalNumberDigits.length === 9 || nationalNumberDigits.length === 8;
    }
    
    if (phoneCountry === '+1') { // USA/Canada
      // North American numbers are exactly 10 digits (3-digit area code + 7-digit number)
      return nationalNumberDigits.length === 10;
    }
    
    // For other countries, just verify the total length is reasonable
    return (countryCodeDigits.length + nationalNumberDigits.length) >= 9;
  }
  
  // Numbers without + should have at least 8 digits
  return cleaned.length >= 8;
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
