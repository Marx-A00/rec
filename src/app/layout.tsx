import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import 'driver.js/dist/driver.css';
import '@/styles/driver-custom.css';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { CollectionToastProvider } from '@/components/ui/CollectionToastProvider';
import { TourProvider } from '@/contexts/TourContext';
import { TourDebugPanel } from '@/components/TourDebugPanel';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Album Recommendations',
  description: 'Share and discover music recommendations',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <QueryProvider>
            <TourProvider>
              <CollectionToastProvider>{children}</CollectionToastProvider>
              <TourDebugPanel />
              <Toaster
                position='top-right'
                toastOptions={{
                  style: {
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    color: '#fafafa',
                  },
                }}
              />
            </TourProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
