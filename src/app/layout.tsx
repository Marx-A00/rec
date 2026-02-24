import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import 'driver.js/dist/driver.css';
import '@/styles/driver-custom.css';
import { Toaster } from 'sonner';

import { auth } from '@/../auth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { CollectionToastProvider } from '@/components/ui/CollectionToastProvider';
import { TourProviderWrapper } from '@/components/providers/TourProviderWrapper';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang='en' className='dark'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider session={session}>
          <QueryProvider>
            <TourProviderWrapper>
              <CollectionToastProvider>{children}</CollectionToastProvider>
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
            </TourProviderWrapper>
          </QueryProvider>
        </SessionProvider>
        <Script
          defer
          src='https://umami-production-08c5.up.railway.app/script.js'
          data-website-id='9b8dd0c0-f9cf-406a-ab48-d4580cfeae39'
        />
      </body>
    </html>
  );
}
