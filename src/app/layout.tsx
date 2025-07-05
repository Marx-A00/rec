import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { CollectionToastProvider } from '@/components/ui/CollectionToastProvider';
import { MusicPlatformTourProvider } from '@/components/MusicPlatformTourProvider';

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
          <MusicPlatformTourProvider>
            <CollectionToastProvider>{children}</CollectionToastProvider>
          </MusicPlatformTourProvider>
        </QueryProvider>
      </SessionProvider>
      </body>
    </html>
  );
}
