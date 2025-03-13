import { get } from 'node:http';

// Create an AbortController
const controller = new AbortController();
const signal = controller.signal;

console.log('Starting fetch with abort...');

// Make a request to our server
const req = get('http://localhost:3000/api/health', {
  signal: signal,
  headers: {
    'X-Test-Abort': 'true'
  }
}, (res) => {
  console.log(`Response status: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log(`Received data: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Response completed');
  });
});

req.on('error', (error) => {
  if (error.name === 'AbortError') {
    console.log('Request was aborted as expected');
  } else {
    console.error('Unexpected error:', error.message);
  }
});

// Abort the request after 50ms
setTimeout(() => {
  console.log('Aborting the request...');
  controller.abort();
}, 50);

// Exit the script after cleanup
setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 1000);
