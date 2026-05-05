import * as React from "react"
import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
    value: number | null | undefined
    onChange: (value: number) => void
}

export function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
    const toString = (v: number | null | undefined) => {
        if (v === null || v === undefined) return ""
        return String(v)
    }

    return (
        <Input
            type="number"
            inputMode="decimal"
            value={toString(value)}
            onChange={(e) => {
                const v = e.target.value
                if (v === "" || v === "-") {
                    onChange(null as any)
                    return
                }
                const n = Number(v)
                onChange(Number.isNaN(n) ? (null as any) : n)
            }}
            {...rest}
        />
    )
}

export default NumberInput
