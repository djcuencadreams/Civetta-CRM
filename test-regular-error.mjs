import fetch from 'node-fetch';

async function testRegularError() {
  console.log('======== TESTING REGULAR ERROR HANDLING ========');
  
  try {
    // Make a request to a non-existent endpoint to trigger a 404
    console.log('Making request to non-existent endpoint...');
    const response = await fetch('http://localhost:3000/api/this-does-not-exist');
    
    if (response.status === 404) {
      console.log('✅ Got expected 404 response');
      console.log('Status:', response.status);
      const errorData = await response.json();
      console.log('Error response:', JSON.stringify(errorData, null, 2));
    } else {
      console.error('❌ Unexpected status code:', response.status);
      console.error('Expected 404 Not Found');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Error type:', error.name);
    console.error('This should have been handled properly');
  }
  
  console.log('Test completed');
}

try {
  await testRegularError();
} catch (error) {
  console.error('Error running test:', error);
}
