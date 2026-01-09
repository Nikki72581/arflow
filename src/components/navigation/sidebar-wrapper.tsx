'use client'

import { useEffect, useRef } from 'react'
import { EnhancedSidebar } from './enhanced-sidebar'

interface SidebarWrapperProps {
  userRole: 'ADMIN' | 'SALESPERSON'
  pendingCount: number
  userName: string
  organizationName: string
}

export function SidebarWrapper(props: SidebarWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateCollapsedAttr = () => {
      if (containerRef.current) {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true'
        containerRef.current.setAttribute('data-collapsed', String(isCollapsed))
      }
    }

    // Initial update
    updateCollapsedAttr()

    // Listen for changes
    const handleStorageChange = () => {
      updateCollapsedAttr()
    }

    window.addEventListener('storage', handleStorageChange)

    // Custom event for same-window updates
    window.addEventListener('sidebar-toggle', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebar-toggle', handleStorageChange)
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full sidebar-container">
      <EnhancedSidebar {...props} />
    </div>
  )
}
