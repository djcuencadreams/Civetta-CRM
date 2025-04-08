
interface PhoneData {
  phoneCountry: string;
  phoneNumber: string;
}

export function buildPhoneNumber({
  phoneCountry,
  phoneNumber,
}: PhoneData): string {
  if (!phoneCountry || !phoneNumber) return "";
  return `${phoneCountry}${phoneNumber}`;
}
