import React from 'react';

interface ContextualHintProps {
  id: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  children: React.ReactNode;
}

// Contextual hints are disabled — render children passthrough.
export default function ContextualHint({ children }: ContextualHintProps) {
  return <>{children}</>;
}
