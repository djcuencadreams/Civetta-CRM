/**
 * Name utilities for generating and handling name field consistently
 * These utilities ensure names are formatted consistently throughout the application
 */

/**
 * Generates a full name from firstName and lastName
 * @param firstName - First name of the customer/lead
 * @param lastName - Last name of the customer/lead
 * @returns Concatenated full name with proper spacing
 */
export function generateFullName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  
  if (!first && !last) return '';
  if (!first) return last;
  if (!last) return first;
  
  return `${first} ${last}`;
}

/**
 * Ensures a customer or lead data object has the name field set based on firstName and lastName
 * @param data Object containing at least firstName and lastName fields
 * @returns Same object with properly set name field
 */
export function ensureNameField<T extends { firstName?: string | null; lastName?: string | null; name?: string | null }>(data: T): T & { name: string } {
  if (data.firstName || data.lastName) {
    return {
      ...data,
      name: generateFullName(data.firstName, data.lastName),
    };
  }
  return {
    ...data,
    name: data.name || ''
  };
}

/**
 * Checks if a person's name is properly formatted
 * @param data Object containing name, firstName, and lastName fields
 * @returns Boolean indicating if name is properly set based on firstName and lastName
 */
export function isNameConsistent(data: { name?: string | null; firstName?: string | null; lastName?: string | null }): boolean {
  if (!data.firstName || !data.lastName) return true; // Can't check consistency without these fields
  
  const expectedName = generateFullName(data.firstName, data.lastName);
  return data.name === expectedName;
}