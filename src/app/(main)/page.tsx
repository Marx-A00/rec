'use client';

import MosaicContainer from '@/components/dashboard/MosaicContainer';

// TODO: figure out why default layout half loads first on page load
export default function Home() {
  // Dashboard controls and WidgetLibrary are handled by DashboardHeaderWrapper
  // which is already wrapping this page in the layout

  return <MosaicContainer />;
}

// TODO: check out memory leak or whatever
// TODO: check out prisma query shits in terminal
