/**
 * Test script to verify the error handling system for aborted requests
 * This script:
 * 1. Makes a slow request to the deliberately slow endpoint
 * 2. Aborts it immediately
 * 3. Verifies no errors are thrown
 */

// Wrapper function to run tests
async function runAbortTest() {
  console.log('Starting abort test...');
  
  // Create abort controller
  const controller = new AbortController();
  const { signal } = controller;
  
  try {
    // Start the slow request
    console.log('Making request to deliberately slow endpoint...');
    
    // Start fetch but don't await it yet
    const fetchPromise = fetch('http://localhost:3000/api/deliberately-slow-endpoint?delay=2000', {
      signal
    });
    
    // Abort immediately
    console.log('Aborting request...');
    controller.abort('Test abort');
    
    // Try to get the response (should throw AbortError)
    console.log('Trying to await aborted fetch...');
    await fetchPromise;
    
    // We should not reach this point
    console.error('ERROR: Fetch completed despite being aborted!');
    
  } catch (error) {
    // If this is an AbortError or contains "abort" in the message, that's expected
    if (error.name === 'AbortError' || 
        (typeof error.message === 'string' && error.message.toLowerCase().includes('abort')) ||
        error.toString().toLowerCase().includes('abort')) {
      console.log('SUCCESS: Caught expected AbortError:', error.message || error);
      return true;
    }
    
    // Otherwise, it's an unexpected error
    console.error('ERROR: Unexpected error caught:', error);
    return false;
  }
}

// Run the test
runAbortTest()
  .then(success => {
    if (success) {
      console.log('✅ Abort test passed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Abort test failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error running abort test:', err);
    process.exit(1);
  });