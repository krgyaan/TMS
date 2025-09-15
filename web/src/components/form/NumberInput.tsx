import * as React from "react"
import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null | undefined
  onChange: (value: number) => void
}

export function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
  const toString = (v: number | null | undefined) => (typeof v === "number" ? String(v) : "")
  const [inner, setInner] = React.useState<string>(toString(value))

  React.useEffect(() => {
    setInner(toString(value))
  }, [value])

  return (
    <Input
      type="number"
      inputMode="decimal"
      value={inner}
      onChange={(e) => {
        const v = e.target.value
        setInner(v)
        if (v === "" || v === "-") {
          onChange(0)
          return
        }
        const n = Number(v)
        onChange(Number.isNaN(n) ? 0 : n)
      }}
      {...rest}
    />
  )
}

export default NumberInput
