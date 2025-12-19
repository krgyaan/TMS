import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export const FileSection = () => {
    const { control, watch } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'files',
    });

    const persons = watch('persons') || [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Files</CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            append({
                                personIndex: persons.length > 0 ? 0 : undefined,
                                name: '',
                                filePath: '',
                                status: true,
                            })
                        }
                        disabled={persons.length === 0}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add File
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {persons.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        Add at least one person before adding files.
                    </div>
                )}
                {fields.length === 0 && persons.length > 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No files added. Click "Add File" to add one.
                    </div>
                )}
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-4">
                                <FormField
                                    control={control}
                                    name={`files.${index}.personIndex`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Person *</FormLabel>
                                            <Select
                                                onValueChange={(value) =>
                                                    field.onChange(parseInt(value))
                                                }
                                                value={field.value?.toString()}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a person" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {persons.map((person: any, idx: number) => (
                                                        <SelectItem key={idx} value={idx.toString()}>
                                                            {person.name || `Person ${idx + 1}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`files.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>File Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter file name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`files.${index}.filePath`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>File Path *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter file path" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="mt-8"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
};
