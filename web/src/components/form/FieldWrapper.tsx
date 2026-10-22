import * as React from "react"
import { type Control, type FieldPath, type FieldValues, type ControllerRenderProps } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { AiIndicatorsContext, AiFieldIndicator } from "./AiIndicatorsContext"
import { Flag } from "lucide-react"

type FieldWrapperProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
    control: Control<TFieldValues>
    name: TName
    label: React.ReactNode
    description?: React.ReactNode
    className?: string
    children: (field: ControllerRenderProps<TFieldValues, TName>) => React.ReactNode
}

export function FieldWrapper<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
    props: FieldWrapperProps<TFieldValues, TName>
) {
    const { control, name, label, description, className, children } = props
    const indicators = React.useContext(AiIndicatorsContext)
    const indicator = indicators?.[name as string]

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    {label ? (
                        <FormLabel className="inline-flex items-center flex-wrap">
                            {label}
                            {indicator && <AiFieldIndicator indicator={indicator} />}
                        </FormLabel>
                    ) : null}
                    <FormControl>{children(field)}</FormControl>
                    {indicator?.flags && indicator.flags.length > 0 && (
                        <div className="mt-1.5 space-y-1" data-testid={`field-flags-${name}`}>
                            {indicator.flags.map((flag, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded"
                                    data-testid="form-field-flag-item"
                                >
                                    <Flag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>{flag.message}</span>
                                    {flag.rawValue && (
                                        <span className="font-mono text-[11px] text-amber-800 dark:text-amber-400">
                                            (Raw: &ldquo;{flag.rawValue}&rdquo;)
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

export default FieldWrapper
