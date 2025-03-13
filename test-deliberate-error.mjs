import fetch from 'node-fetch';

async function testDeliberateError() {
  console.log('======== TESTING DELIBERATE ERROR HANDLING ========');
  
  try {
    // Make a request to an endpoint that deliberately throws an error
    console.log('Making request to error endpoint...');
    const response = await fetch('http://localhost:3000/api/test-error');
    
    console.log('Status Code:', response.status);
    
    if (response.status >= 400) {
      console.log('✅ Got expected error response');
      const errorData = await response.json().catch(() => null) || await response.text();
      console.log('Error response:', typeof errorData === 'string' ? errorData : JSON.stringify(errorData, null, 2));
    } else {
      console.log('❌ Unexpected success status code:', response.status);
      const body = await response.text();
      console.log('Response body:', body.length > 200 ? body.slice(0, 200) + '...' : body);
    }
  } catch (error) {
    console.error('❌ Unexpected fetch error:', error.message);
    console.error('Error type:', error.name);
    console.error('This should have been handled by server response with error status');
  }
  
  console.log('Test completed');
}

try {
  await testDeliberateError();
} catch (error) {
  console.error('Error running test:', error);
}
