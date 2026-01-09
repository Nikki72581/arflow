import * as React from "react"
import { Calculator, Delete } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type NumberInputProps = React.ComponentProps<typeof Input> & {
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
  showCalculator?: boolean
}

const calculatorRows = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "=", "+"],
]

function NumberInput({
  startAdornment,
  endAdornment,
  showCalculator = true,
  className,
  onChange,
  value,
  defaultValue,
  ...props
}: NumberInputProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [expression, setExpression] = React.useState("")

  const hasEndAdornment = Boolean(endAdornment)
  const rightPadding = showCalculator && hasEndAdornment
    ? "pr-14"
    : showCalculator || hasEndAdornment
      ? "pr-10"
      : undefined

  React.useEffect(() => {
    if (!open) {
      return
    }

    const resolvedValue = value !== undefined
      ? String(value)
      : inputRef.current?.value ?? ""
    setExpression(resolvedValue)

    const handlePointer = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)

    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, value])

  const commitValue = (nextValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: nextValue },
        currentTarget: { value: nextValue },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
      return
    }

    if (inputRef.current) {
      inputRef.current.value = nextValue
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }

  const evaluateExpression = () => {
    const sanitized = expression.replace(/[^0-9+\-*/.()]/g, "")
    if (!sanitized) {
      return
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict";return (${sanitized})`)() as number
      if (!Number.isFinite(result)) {
        return
      }
      const formatted = Number.isInteger(result)
        ? String(result)
        : String(parseFloat(result.toFixed(6)))
      setExpression(formatted)
      commitValue(formatted)
      setOpen(false)
    } catch {
      // Leave expression as-is on error.
    }
  }

  const handleButton = (symbol: string) => {
    if (symbol === "=") {
      evaluateExpression()
      return
    }
    setExpression((prev) => `${prev}${symbol}`)
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {startAdornment && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {startAdornment}
        </span>
      )}
      {hasEndAdornment && (
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
            showCalculator ? "right-9" : "right-3"
          )}
        >
          {endAdornment}
        </span>
      )}
      <Input
        {...props}
        ref={inputRef}
        type="number"
        inputMode="decimal"
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className={cn(
          startAdornment && "pl-7",
          rightPadding,
          className
        )}
      />
      {showCalculator && (
        <>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open calculator"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((prev) => !prev)}
          >
            <Calculator className="h-4 w-4" />
          </button>
          {open && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
              role="dialog"
            >
              <div className="mb-2 rounded-md border bg-muted/40 px-2 py-1 text-right text-sm font-mono">
                {expression || "0"}
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                  onClick={() => setExpression("")}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                  onClick={() => setExpression((prev) => prev.slice(0, -1))}
                >
                  <Delete className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {calculatorRows.flat().map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className={cn(
                      "rounded-md border bg-background py-2 text-sm font-medium hover:bg-muted",
                      symbol === "=" && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => handleButton(symbol)}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export { NumberInput }
