import fetch from 'node-fetch';

async function inspectResponse() {
  console.log('======== INSPECTING RESPONSE FROM NON-EXISTENT ENDPOINT ========');
  
  try {
    // Make a request to a non-existent endpoint to trigger a 404
    console.log('Making request to non-existent endpoint...');
    const response = await fetch('http://localhost:3000/api/this-does-not-exist');
    
    console.log('Status Code:', response.status);
    console.log('Headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    
    // Get the response body as text
    const body = await response.text();
    console.log('Response body:', body.length > 500 ? body.slice(0, 500) + '...' : body);
    
    // Check if it's an HTML response (which could mean Vite is intercepting)
    if (body.includes('<!DOCTYPE html>')) {
      console.log('Note: Response contains HTML, which indicates Vite development server is intercepting the request');
    }
  } catch (error) {
    console.error('Error inspecting response:', error);
  }
  
  console.log('Inspection completed');
}

try {
  await inspectResponse();
} catch (error) {
  console.error('Error running inspection:', error);
}
