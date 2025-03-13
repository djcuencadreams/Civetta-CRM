import fetch from 'node-fetch';

async function testAbortedFetch() {
  console.log('======== TESTING ABORT ERROR HANDLING ========');
  
  try {
    // Create an AbortController to cancel the request
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Start a slow request that we'll abort
    console.log('Starting a fetch request that will be aborted...');
    
    // Promise that will fetch data but be aborted
    const fetchPromise = fetch('http://localhost:3000/api/deliberately-slow-endpoint?delay=5000', {
      signal: signal,
      headers: {
        'X-Test-Abort': 'true'
      }
    });
    
    // Wait briefly then abort the request
    console.log('Will abort request in 100ms...');
    setTimeout(() => {
      console.log('Aborting request now!');
      controller.abort();
    }, 100);
    
    // Try to get the response
    console.log('Waiting for response...');
    const response = await fetchPromise;
    console.log(`Unexpected success! Got response with status: ${response.status}`);
    
  } catch (error) {
    // This is expected - we should get an AbortError
    if (error.name === 'AbortError') {
      console.log('✅ Got expected AbortError:', error.message);
      console.log('Error type:', error.name);
      console.log('Our error handling would have suppressed this properly');
    } else {
      console.error('❌ Unexpected error type:', error.name);
      console.error('Error message:', error.message);
      console.error('This should have been handled differently');
    }
  }
  
  console.log('Test completed');
}

// Install node-fetch if not available
try {
  await testAbortedFetch();
} catch (error) {
  console.error('Error running test:', error);
}
