'use client';

interface SidebarLayoutWrapperProps {
  children: React.ReactNode;
  headerControls?: React.ReactNode;
}

export default function SidebarLayoutWrapper({
  children,
  headerControls,
}: SidebarLayoutWrapperProps) {
  // No sidebar collapse state management needed currently
  // The sidebar is always visible on desktop, hidden on mobile

  return (
    <div
      id='main-content'
      role='main'
      className="transition-all duration-300 md:ml-16"
    >
      {headerControls ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            {children}
          </div>
          <div className="flex-shrink-0 ml-4 mr-8">
            {headerControls}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
