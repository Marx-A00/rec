'use client';

import CustomizableDashboard from '@/components/dashboard/CustomizableDashboard';
// TODO: figure out why default layout half loads first on page load
export default function Home() {
  return <CustomizableDashboard />;
}

// TODO: check out memory leak or whatever
// TODO: check out prisma query shits in terminal
