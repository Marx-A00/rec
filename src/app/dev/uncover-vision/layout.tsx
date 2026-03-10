/**
 * Layout for /dev/uncover-vision — mimics the game layout positioning
 * (fixed below TopBar, offset for sidebar) without the smoke background.
 */
export default function VisionTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='fixed inset-x-0 bottom-0 top-[65px] flex flex-col overflow-hidden md:left-16 bg-zinc-950'>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
    </div>
  );
}
