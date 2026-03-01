import { UncoverPageHeader } from '@/components/uncover/UncoverPageHeader';

/**
 * Shared layout for all /game/* routes.
 * Fixed positioning below TopBar (65px) with sidebar offset (md:ml-16).
 * Renders page header with tabs, then child content fills remaining space.
 */
export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='fixed inset-x-0 bottom-0 top-[65px] flex flex-col overflow-hidden md:left-16'>
      <UncoverPageHeader />
      <div className='min-h-0 flex-1'>{children}</div>
    </div>
  );
}
