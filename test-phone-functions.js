// Test phone utility functions
import { parsePhoneNumber, joinPhoneNumber } from './server/utils/phone-utils.js';

console.log("Testing phone utility functions...");

// Test 1: Parse phone number with plus sign
console.log("\nTEST 1: Parse phone number with plus sign");
console.log(parsePhoneNumber("+593996789012"));

// Test 2: Parse phone number without plus sign
console.log("\nTEST 2: Parse phone number without plus sign");
console.log(parsePhoneNumber("593996789012"));

// Test 3: Parse phone number with country code and spaces
console.log("\nTEST 3: Parse phone number with country code and spaces");
console.log(parsePhoneNumber("+593 99 678 9012"));

// Test 4: Join phone country and number (country with plus)
console.log("\nTEST 4: Join phone country and number (country with plus)");
console.log(joinPhoneNumber("+593", "996789012"));

// Test 5: Join phone country and number (country without plus)
console.log("\nTEST 5: Join phone country and number (country without plus)");
console.log(joinPhoneNumber("593", "996789012"));

// Test 6: Join with empty values
console.log("\nTEST 6: Join with empty values");
console.log(joinPhoneNumber("", ""));

// Test 7: Parse empty value
console.log("\nTEST 7: Parse empty value");
console.log(parsePhoneNumber(""));