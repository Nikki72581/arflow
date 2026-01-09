"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  value?: string
  onValueChange?: (value: string) => void
  type?: 'single' | 'multiple'
  collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue>({})

interface AccordionProps {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = 'single', collapsible = true, value, defaultValue, onValueChange, className, children }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '')
    const currentValue = value !== undefined ? value : internalValue

    const handleValueChange = React.useCallback((newValue: string) => {
      const nextValue = currentValue === newValue && collapsible ? '' : newValue
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    }, [currentValue, collapsible, value, onValueChange])

    return (
      <AccordionContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, type, collapsible }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemContextValue {
  isOpen: boolean
  toggle: () => void
}

const AccordionItemContext = React.createContext<AccordionItemContextValue>({
  isOpen: false,
  toggle: () => {},
})

interface AccordionItemProps {
  value: string
  className?: string
  children?: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children }, ref) => {
    const { value: accordionValue, onValueChange } = React.useContext(AccordionContext)
    const isOpen = accordionValue === value

    const toggle = React.useCallback(() => {
      onValueChange?.(value)
    }, [value, onValueChange])

    return (
      <AccordionItemContext.Provider value={{ isOpen, toggle }}>
        <div ref={ref} className={cn("border-b", className)}>
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps {
  className?: string
  children?: React.ReactNode
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children }, ref) => {
    const { isOpen, toggle } = React.useContext(AccordionItemContext)

    return (
      <h3 className="flex">
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline text-left",
            className
          )}
        >
          {children}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </h3>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  className?: string
  children?: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children }, ref) => {
    const { isOpen } = React.useContext(AccordionItemContext)

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden text-sm transition-all duration-200",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
