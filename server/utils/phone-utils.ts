
interface PhoneData {
  phoneCountry?: string | null;
  phoneNumber?: string | null;
}

export function buildPhoneNumber(data: PhoneData): string | null {
  if (!data.phoneCountry || !data.phoneNumber) {
    return null;
  }
  
  const country = data.phoneCountry.trim().replace(/^\+/, '');
  const number = data.phoneNumber.trim().replace(/[^0-9]/g, '');
  
  if (!country || !number) {
    return null;
  }
  
  return `+${country}${number}`;
}
