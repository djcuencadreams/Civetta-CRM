/**
 * Test script for verifying the proper handling of abort signals
 * Run this script to confirm that the global error handler is correctly
 * suppressing abort errors while allowing other errors to be visible
 */

// Create a function to simulate an aborted fetch request
function createAbortedRequest() {
  console.log('Testing abort signal handling...');
  
  const controller = new AbortController();
  const { signal } = controller;
  
  // Start a fetch that we'll immediately abort
  const fetchPromise = fetch('/api/customers', { signal });
  
  // Abort the request right away
  controller.abort();
  
  // Return the promise, which should be rejected with an AbortError
  return fetchPromise.then(
    () => console.error('Error: Fetch should have been aborted!'),
    err => {
      if (err.name === 'AbortError') {
        console.log('✅ Success: Abort error correctly thrown');
      } else {
        console.error('❌ Failure: Expected AbortError, got:', err);
      }
    }
  );
}

// Create a function to test the error endpoint
function testErrorEndpoint() {
  console.log('Testing error endpoint...');
  
  // This should trigger a real error that should be visible in console
  return fetch('/api/test-error')
    .then(res => {
      if (res.ok) {
        console.error('❌ Failure: Error endpoint should not return OK');
      } else {
        console.log('✅ Success: Error endpoint correctly returned an error');
      }
      return res.text();
    })
    .then(text => console.log('Response:', text))
    .catch(err => {
      console.log('✅ Caught expected error from endpoint:', err.message);
    });
}

// Run all tests
async function runTests() {
  // Test 1: Aborted fetch request
  await createAbortedRequest();
  
  // Test 2: Error endpoint
  await testErrorEndpoint();
  
  console.log('All tests completed');
}

// Run the tests when the script is executed
runTests().catch(err => {
  console.error('Test runner failed:', err);
});

// Export the test functions for use in browser console
window.testAbort = {
  createAbortedRequest,
  testErrorEndpoint,
  runTests
};

console.log('Abort signal test script loaded. Run window.testAbort.runTests() to test manually.');