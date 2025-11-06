import * as React from "react"
import { type Control, type FieldPath, type FieldValues, type ControllerRenderProps } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"

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
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    {label ? <FormLabel>{label}</FormLabel> : null}
                    <FormControl>{children(field)}</FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

export default FieldWrapper
