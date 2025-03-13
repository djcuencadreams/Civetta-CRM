// Special test component that forces the abort error
import React, { useEffect, useState } from 'react';

export function RuntimeErrorTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // This will cause an abort error that our fix should handle
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // This will start a slow request
        const response = await fetch('/api/deliberately-slow-endpoint?delay=5000', {
          signal: controller.signal
        });
        
        // We should never get here because we abort immediately
        const data = await response.json();
        console.log('Data:', data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
          // This should be suppressed by our error handling
          console.error('TEST ERROR:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Immediately abort to trigger the error
    setTimeout(() => {
      controller.abort('Test abort error');
      console.log('Aborted request deliberately for testing');
    }, 100);
    
    return () => {
      controller.abort('Component unmounted');
    };
  }, []);
  
  return (
    <div>
      <h2>Runtime Error Test</h2>
      <p>Testing if "[plugin:runtime-error-plugin] signal is aborted without reason" error is suppressed</p>
      <pre>
        {loading ? 'Loading...' : error ? `Error: ${error.message}` : 'No error displayed!'}
      </pre>
    </div>
  );
}