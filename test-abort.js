/**
 * Script to test the AbortController fix
 * 
 * This script simulates different abortion scenarios to verify that 
 * the fix for the Vite runtime error plugin works correctly.
 */

// Utility to create a delay promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test case 1: Basic AbortController abort
 * Creates a fetch request and immediately aborts it
 */
async function testBasicAbort() {
  console.log('\n----- Test 1: Basic Abort -----');
  const controller = new AbortController();
  const signal = controller.signal;
  
  // Start the fetch but abort it immediately
  const fetchPromise = fetch('http://localhost:3000/api/health', { signal })
    .then(r => {
      console.log('✓ Fetch completed successfully (unexpected)');
      return r.json();
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('✓ Received expected AbortError');
      } else {
        console.error('✗ Unexpected error:', error);
      }
    });
  
  // Abort immediately
  controller.abort();
  console.log('✓ Abort signal triggered');
  
  // Wait for fetch to complete/fail
  await fetchPromise;
}

/**
 * Test case 2: Timing race condition
 * Tests abortion during an active fetch
 */
async function testTimingRaceCondition() {
  console.log('\n----- Test 2: Timing Race Condition -----');
  const controller = new AbortController();
  const signal = controller.signal;
  
  // Start a fetch to a slow endpoint
  console.log('✓ Starting fetch to slow endpoint');
  const fetchPromise = fetch('http://localhost:3000/api/deliberately-slow-endpoint', { signal })
    .then(r => {
      console.log('✗ Fetch completed successfully (unexpected)');
      return r.json();
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('✓ Received expected AbortError');
      } else {
        console.error('✗ Unexpected error:', error);
      }
    });
  
  // Wait a bit and then abort
  await delay(50);
  controller.abort();
  console.log('✓ Abort signal triggered after delay');
  
  // Wait for fetch to complete/fail
  await fetchPromise;
}

/**
 * Test case 3: Unhandled Promise rejection with AbortError
 * Tests that unhandled AbortErrors are properly filtered
 */
async function testUnhandledRejection() {
  console.log('\n----- Test 3: Unhandled Rejection -----');
  
  // Create a rejected promise with an AbortError
  // This would normally trigger the Vite runtime error overlay
  const abortError = new DOMException('signal is aborted without reason', 'AbortError');
  Promise.reject(abortError);
  
  console.log('✓ Rejected Promise with AbortError (check browser for error overlay)');
  console.log('  If no error overlay appeared, the fix is working!');
  
  await delay(1000); // Give time for error overlay to appear if it's going to
}

/**
 * Run all tests
 */
async function runAbortTest() {
  console.log('Starting AbortController test suite...');
  console.log('This tests the fix for Vite runtime error plugin');
  console.log('-------------------------------------------');
  
  try {
    await testBasicAbort();
    await testTimingRaceCondition();
    await testUnhandledRejection();
    
    console.log('\n✅ All tests completed');
    console.log('If no error overlays appeared during testing, the fix is working!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run all tests
runAbortTest().catch(console.error);