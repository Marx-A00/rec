import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'rec - Discover Music Through Recommendations',
  description:
    'Share and discover music recommendations from people with great taste. Find your next favorite album.',
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className='min-h-screen bg-black'>{children}</div>;
}
