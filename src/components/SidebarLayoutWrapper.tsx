'use client';

import { useState, useEffect } from 'react';

interface SidebarLayoutWrapperProps {
  children: React.ReactNode;
}

export default function SidebarLayoutWrapper({
  children,
}: SidebarLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Load initial state from localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }

    // Listen for storage changes (when sidebar state changes in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed' && e.newValue !== null) {
        setIsCollapsed(JSON.parse(e.newValue));
      }
    };

    // Listen for custom events from the sidebar component
    const handleSidebarToggle = () => {
      const currentState = localStorage.getItem('sidebar-collapsed');
      if (currentState !== null) {
        setIsCollapsed(JSON.parse(currentState));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sidebar-toggled', handleSidebarToggle);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggled', handleSidebarToggle);
    };
  }, []);

  return (
    <div
      className={`transition-all duration-300 ${
        isCollapsed ? 'md:ml-0' : 'md:ml-16'
      }`}
    >
      {children}
    </div>
  );
}
