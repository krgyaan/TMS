import { useFieldArray, type Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from './FieldWrapper';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, User, Mail, Phone, AlertCircle } from 'lucide-react';

interface ContactPerson {
    name: string;
    phone?: string | null;
    email?: string | null;
}

interface ContactPersonFieldsProps<TFieldValues extends Record<string, any>> {
    control: Control<TFieldValues>;
    name: string;
    label?: string;
}

export function ContactPersonFields<TFieldValues extends Record<string, any>>({
    control,
    name,
    label = 'Contact Person(s)',
}: ContactPersonFieldsProps<TFieldValues>) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: name as any,
    });

    const handleAddPerson = () => {
        append({ name: '', phone: '', email: '' } as any);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-semibold text-base text-primary">{label}</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPerson}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Person
                </Button>
            </div>

            {fields.length === 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please add at least one contact person.</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">Person {index + 1}</h5>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name={`${name}.${index}.name` as any} label="Full Name">
                                {(fieldProps) => (
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...fieldProps} className="pl-10" placeholder="Enter full name" />
                                    </div>
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={control} name={`${name}.${index}.phone` as any} label="Phone Number">
                                {(fieldProps) => (
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...fieldProps} className="pl-10" placeholder="Enter phone number" />
                                    </div>
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={control} name={`${name}.${index}.email` as any} label="Email Address">
                                {(fieldProps) => (
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            {...fieldProps}
                                            type="email"
                                            className="pl-10"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
