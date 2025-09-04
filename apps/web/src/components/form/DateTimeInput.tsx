import * as React from "react"
import { Input } from "@/components/ui/input"

type DateTimeInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string | null | undefined
  onChange: (value: string) => void
}

export function DateTimeInput({ value, onChange, onFocus, onClick, ...rest }: DateTimeInputProps) {
  const normalize = (v: string | null | undefined) => {
    if (!v) return ""
    const s = String(v)
    if (!s.includes("T")) return s
    const [d, t] = s.split("T")
    // Accept minutes only for compatibility with datetime-local
    const hhmm = t.slice(0, 5)
    return `${d}T${hhmm}`
  }

  const [inner, setInner] = React.useState<string>(normalize(value))

  React.useEffect(() => {
    setInner(normalize(value))
  }, [value])

  return (
    <Input
      type="datetime-local"
      value={inner}
      onFocus={(e) => {
        ;(e.currentTarget as HTMLInputElement).showPicker?.()
        onFocus?.(e)
      }}
      onClick={(e) => {
        ;(e.currentTarget as HTMLInputElement).showPicker?.()
        onClick?.(e)
      }}
      onChange={(e) => {
        const v = e.target.value // yyyy-mm-ddTHH:mm or ""
        setInner(v)
        onChange(v)
      }}
      {...rest}
    />
  )
}

export default DateTimeInput
