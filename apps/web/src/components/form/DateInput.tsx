import * as React from "react"
import { Input } from "@/components/ui/input"

type DateInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string | null | undefined
  onChange: (value: string) => void
}

export function DateInput({ value, onChange, onFocus, onClick, ...rest }: DateInputProps) {
  const toDateOnly = (v: string | null | undefined) => {
    if (!v) return ""
    const s = String(v)
    return s.includes("T") ? s.split("T")[0] : s
  }

  const [inner, setInner] = React.useState<string>(toDateOnly(value))

  React.useEffect(() => {
    setInner(toDateOnly(value))
  }, [value])

  return (
    <Input
      type="date"
      value={inner}
      onFocus={(e) => {
        // Open native picker immediately when focused
        ;(e.currentTarget as HTMLInputElement).showPicker?.()
        onFocus?.(e)
      }}
      onClick={(e) => {
        // Ensure clicking also opens the picker without extra keypress
        ;(e.currentTarget as HTMLInputElement).showPicker?.()
        onClick?.(e)
      }}
      onChange={(e) => {
        const v = e.target.value // yyyy-mm-dd or ""
        setInner(v)
        onChange(v)
      }}
      {...rest}
    />
  )
}

export default DateInput
