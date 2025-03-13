// Test script to simulate an aborted request
import * as http from 'http';

// Function to create a request that will be aborted
function createAbortedRequest() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      // Use a route that should take some time to process
      path: '/api/export/all',
      method: 'GET'
    });
    
    req.on('error', (err) => {
      console.log(`Request aborted: ${err.message}`);
      resolve();
    });
    
    // Send the request
    req.end();
    
    console.log('Sending request that will be aborted...');
    // Wait a bit to let request start processing, then abort it
    setTimeout(() => {
      console.log('Aborting request...');
      req.destroy();
    }, 50);
  });
}

// Function to test error handling
function testErrorEndpoint() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/test-error',
      method: 'GET'
    }, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response data: ${data}`);
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error(`Error during request: ${err.message}`);
      resolve();
    });
    
    req.end();
    console.log('Testing error handling endpoint...');
  });
}

// Run tests
async function runTests() {
  console.log('=== Testing Error Handling Middleware ===');
  
  console.log('\n--- Test 1: Error Handling ---');
  await testErrorEndpoint();
  
  console.log('\n--- Test 2: Aborted Request ---');
  await createAbortedRequest();
  
  console.log('\nAll tests completed.');
}

runTests();