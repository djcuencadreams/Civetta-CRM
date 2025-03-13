// test-all.js - Comprehensive error handling test script
import fetch from 'node-fetch';

// Utility function to create colored console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print section header
function section(title) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(70) + colors.reset);
  console.log(colors.bright + colors.blue + '== ' + title + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(70) + colors.reset + '\n');
}

// Success message
function success(message) {
  console.log(colors.green + '✅ ' + message + colors.reset);
}

// Error message
function error(message) {
  console.log(colors.red + '❌ ' + message + colors.reset);
}

// Info message
function info(message) {
  console.log(colors.cyan + 'ℹ️ ' + message + colors.reset);
}

// Warning message
function warning(message) {
  console.log(colors.yellow + '⚠️ ' + message + colors.reset);
}

// Delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Basic aborted fetch
async function testAbortedFetch() {
  section('TEST 1: Basic Aborted Fetch');
  
  try {
    // Create an AbortController
    const controller = new AbortController();
    const signal = controller.signal;
    
    info('Starting a fetch request that will be aborted...');
    
    // Promise that will be aborted
    const fetchPromise = fetch('http://localhost:3000/api/deliberately-slow-endpoint?delay=3000', {
      signal: signal,
      headers: {
        'X-Test-Abort': 'true'
      }
    });
    
    // Abort the request after a short time
    setTimeout(() => {
      info('Aborting request now...');
      controller.abort();
    }, 100);
    
    info('Waiting for response...');
    const response = await fetchPromise;
    
    error('Unexpected success! Got response with status: ' + response.status);
    
  } catch (err) {
    if (err.name === 'AbortError') {
      success('Got expected AbortError: ' + err.message);
      info('Error type: ' + err.name);
      info('Our handling would have suppressed this appropriately');
    } else {
      error('Unexpected error type: ' + err.name);
      error('Error message: ' + err.message);
    }
  }
}

// Test 2: Regular API error
async function testRegularApiError() {
  section('TEST 2: Regular API Error');
  
  try {
    info('Making request to error-generating endpoint...');
    const response = await fetch('http://localhost:3000/api/test-error');
    
    info('Got response with status: ' + response.status);
    
    if (response.status >= 400) {
      success('Received error status code: ' + response.status);
      const errorData = await response.json().catch(() => null) || await response.text();
      info('Error response: ' + (typeof errorData === 'string' ? errorData : JSON.stringify(errorData, null, 2).slice(0, 200) + '...'));
      info('Our error boundary would have displayed this properly');
    } else {
      error('Expected error status but got: ' + response.status);
    }
  } catch (err) {
    error('Unexpected fetch error: ' + err.message);
    error('Error type: ' + err.name);
    error('Our error handling should have returned an error response instead');
  }
}

// Test 3: Simultaneous requests with one aborted
async function testSimultaneousRequests() {
  section('TEST 3: Simultaneous Requests (One Aborted)');
  
  try {
    // Controller for the request we'll abort
    const controller = new AbortController();
    
    // Start two requests simultaneously
    info('Starting two simultaneous requests (will abort one)...');
    
    // First request - will complete normally
    const normalRequest = fetch('http://localhost:3000/api/health')
      .then(res => {
        success('Normal request completed with status: ' + res.status);
        return res.json();
      })
      .then(data => {
        info('Health check data received successfully');
        return { success: true, data };
      })
      .catch(err => {
        error('Normal request failed: ' + err.message);
        return { success: false, error: err };
      });
    
    // Second request - will be aborted
    const abortableRequest = fetch('http://localhost:3000/api/deliberately-slow-endpoint?delay=3000', {
      signal: controller.signal
    })
      .then(res => {
        error('Abortable request unexpectedly completed with status: ' + res.status);
        return { success: true, aborted: false };
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          success('Abortable request was properly aborted: ' + err.message);
          return { success: false, aborted: true };
        } else {
          error('Abortable request failed with unexpected error: ' + err.message);
          return { success: false, aborted: false, error: err };
        }
      });
    
    // Abort the second request after a delay
    setTimeout(() => {
      info('Aborting the second request...');
      controller.abort();
    }, 100);
    
    // Wait for both to complete
    info('Waiting for both requests to resolve...');
    const [normalResult, abortResult] = await Promise.all([normalRequest, abortableRequest]);
    
    if (normalResult.success && abortResult.aborted) {
      success('Test passed: Normal request completed while abortable request was properly aborted');
    } else {
      warning('Test results mixed: Normal request success: ' + normalResult.success + 
              ', Abortable request aborted: ' + (abortResult.aborted ? 'yes' : 'no'));
    }
    
  } catch (err) {
    error('Test failed with unexpected error: ' + err.message);
  }
}

// Run all tests
async function runAllTests() {
  section('STARTING COMPREHENSIVE ERROR HANDLING TESTS');
  
  try {
    await testAbortedFetch();
    await delay(1000); // Small delay between tests
    
    await testRegularApiError();
    await delay(1000);
    
    await testSimultaneousRequests();
    
    section('ALL TESTS COMPLETED');
  } catch (err) {
    error('Test suite failed: ' + err.message);
  }
}

// Run the tests
runAllTests().catch(console.error);
