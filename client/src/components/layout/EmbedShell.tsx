import React from 'react';

interface EmbedShellProps {
  children: React.ReactNode;
}

export function EmbedShell({ children }: EmbedShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {children}
      </div>
    </div>
  );
}