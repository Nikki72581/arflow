'use client'

import { ThemeProvider } from './theme-provider'
import { useEffect, useState } from 'react'

interface ThemeWrapperProps {
  children: React.ReactNode
  initialTheme?: string
}

export function ThemeWrapper({ children, initialTheme = 'system' }: ThemeWrapperProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    (initialTheme as 'light' | 'dark' | 'system') || 'system'
  )

  // Sync theme if initialTheme changes (e.g., after user updates settings)
  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme as 'light' | 'dark' | 'system')
    }
  }, [initialTheme])

  return (
    <ThemeProvider defaultTheme={theme}>
      {children}
    </ThemeProvider>
  )
}
