import React from 'react';
import { Shell } from './Shell';

interface CrmLayoutProps {
  children: React.ReactNode;
}

export function CrmLayout({ children }: CrmLayoutProps) {
  return (
    <Shell>
      <main className="flex-1">
        {children}
      </main>
    </Shell>
  );
}