import { joinPhoneNumber, parsePhoneNumber } from './server/utils/phone-utils';

// Test the joinPhoneNumber function
console.log("=== Testing joinPhoneNumber ===");
console.log('With plus: ' + joinPhoneNumber('+593', '987654321'));
console.log('Without plus: ' + joinPhoneNumber('593', '987654321'));

// Test the parsePhoneNumber function
console.log("\n=== Testing parsePhoneNumber ===");
console.log('With plus:');
console.log(parsePhoneNumber('+593987654321'));
console.log('Without plus:');
console.log(parsePhoneNumber('593987654321'));
console.log('With country code in separate format:');
console.log(parsePhoneNumber('+593 987654321'));
