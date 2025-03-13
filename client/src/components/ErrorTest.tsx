import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

export function ErrorTest() {
  const [shouldError, setShouldError] = useState(false);
  
  // This will throw an error when shouldError is true
  if (shouldError) {
    throw new Error("This is a test error thrown from ErrorTest component");
  }
  
  return (
    <div className="p-4 border rounded my-4">
      <h3 className="text-lg font-medium mb-2">Error Boundary Test</h3>
      <p className="mb-4">Click the button below to test the Error Boundary</p>
      <Button 
        variant="destructive" 
        onClick={() => setShouldError(true)}
      >
        Throw Test Error
      </Button>
    </div>
  );
}