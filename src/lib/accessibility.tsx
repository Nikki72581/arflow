/**
 * Accessibility Utilities
 * Helpers for improving keyboard navigation and screen reader support
 */

/**
 * Generate accessible ID for form fields
 */
export function generateA11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Common ARIA labels for commission app
 */
export const ARIA_LABELS = {
  // Navigation
  mainNav: 'Main navigation',
  breadcrumb: 'Breadcrumb navigation',
  pagination: 'Pagination navigation',

  // Actions
  create: (item: string) => `Create new ${item}`,
  edit: (item: string) => `Edit ${item}`,
  delete: (item: string) => `Delete ${item}`,
  approve: (item: string) => `Approve ${item}`,
  reject: (item: string) => `Reject ${item}`,
  export: (item: string) => `Export ${item} to CSV`,
  search: (item: string) => `Search ${item}`,
  filter: (item: string) => `Filter ${item}`,
  sort: (item: string) => `Sort ${item}`,

  // Status
  loading: 'Loading content',
  saving: 'Saving changes',
  processing: 'Processing request',

  // Forms
  required: 'Required field',
  optional: 'Optional field',
  invalid: 'Invalid input',

  // Commission-specific
  commissionAmount: 'Commission amount',
  saleAmount: 'Sale amount',
  commissionRate: 'Commission rate percentage',
  selectCommission: (amount: string) => `Select commission of ${amount}`,
  approveCommission: (amount: string) => `Approve commission of ${amount}`,
  payCommission: (amount: string) => `Mark commission of ${amount} as paid`,
}

/**
 * Keyboard navigation helpers
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
}

/**
 * Handle keyboard event for common actions
 */
export function handleKeyboardAction(
  event: React.KeyboardEvent,
  callback: () => void
) {
  if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
    event.preventDefault()
    callback()
  }
}

/**
 * Focus trap for modals and dialogs
 */
export function setupFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  if (!containerRef.current) return

  const focusableElements = containerRef.current.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }

  document.addEventListener('keydown', handleTab)
  firstElement?.focus()

  return () => {
    document.removeEventListener('keydown', handleTab)
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Screen reader only class (add to globals.css)
 */
export const SR_ONLY_CLASS = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`

/**
 * Skip to main content link (add to layout)
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
    >
      Skip to main content
    </a>
  )
}

/**
 * Example usage in components:
 * 
 * // Button with ARIA label
 * <button aria-label={ARIA_LABELS.approve('commission')}>
 *   <CheckIcon />
 * </button>
 * 
 * // Keyboard navigation
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onKeyDown={(e) => handleKeyboardAction(e, handleClick)}
 *   onClick={handleClick}
 * >
 *   Click or press Enter/Space
 * </div>
 * 
 * // Announce to screen reader
 * announceToScreenReader('Commission approved successfully')
 * 
 * // Loading state
 * <div role="status" aria-live="polite" aria-busy="true">
 *   <LoadingSpinner />
 *   <span className="sr-only">Loading commissions</span>
 * </div>
 */
