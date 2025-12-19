import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

export const GstSection = () => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'gsts',
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>GST Numbers</CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            append({
                                gstState: '',
                                gstNum: '',
                                status: true,
                            })
                        }
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add GST
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No GST numbers added. Click "Add GST" to add one.
                    </div>
                )}
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-4">
                                <FormField
                                    control={control}
                                    name={`gsts.${index}.gstState`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST State *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter GST state" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`gsts.${index}.gstNum`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST Number *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter GST number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`gsts.${index}.status`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Active</FormLabel>
                                            </div>
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
