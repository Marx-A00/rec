import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | Album Recommendations',
  description: 'Sign in or register for Album Recommendations',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='min-h-screen bg-black flex items-center justify-center'>
      <div className='w-full max-w-md px-6 py-8'>{children}</div>
    </div>
  );
}
