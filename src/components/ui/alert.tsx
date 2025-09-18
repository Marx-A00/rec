import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function Alert({ children, variant = 'default', className = '' }: AlertProps) {
  const baseClasses = 'rounded-lg border p-4';
  const variantClasses = {
    default: 'bg-zinc-900 border-zinc-700 text-zinc-100',
    destructive: 'bg-red-900/50 border-red-700 text-red-100',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function AlertDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>;
}

export function AlertTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-base font-medium ${className}`}>{children}</div>;
}