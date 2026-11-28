import * as React from "react"
import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
    value: number | null | undefined
    onChange: (value: number) => void
}

export function NumberInput({ value, onChange, onBlur, onFocus, ...rest }: NumberInputProps) {
    const [raw, setRaw] = React.useState(value === null || value === undefined ? "" : String(value))
    const [focused, setFocused] = React.useState(false)

    React.useEffect(() => {
        if (!focused) {
            setRaw(value === null || value === undefined ? "" : String(value))
        }
    }, [value, focused])

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let next = event.target.value.replace(/[^0-9.\-]/g, "")
        const negative = next.startsWith("-")
        next = next.replace(/-/g, "")
        const dotIndex = next.indexOf(".")
        if (dotIndex !== -1) {
            next = `${next.slice(0, dotIndex + 1)}${next.slice(dotIndex + 1).replace(/\./g, "")}`
        }
        if (negative) {
            next = `-${next}`
        }

        setRaw(next)

        if (next === "" || next === "-" || next === "." || next === "-.") {
            onChange(null as any)
            return
        }

        const parsed = Number(next)
        onChange(Number.isNaN(parsed) ? (null as any) : parsed)
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false)
        const normalized = raw.endsWith(".") ? raw.slice(0, -1) : raw
        setRaw(normalized)
        if (normalized === "" || normalized === "-" || normalized === "-0") {
            onChange(null as any)
        } else {
            const parsed = Number(normalized)
            onChange(Number.isNaN(parsed) ? (null as any) : parsed)
        }
        onBlur?.(event)
    }

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={handleChange}
            onFocus={(event) => {
                setFocused(true)
                onFocus?.(event)
            }}
            onBlur={handleBlur}
            {...rest}
        />
    )
}

export default NumberInput
