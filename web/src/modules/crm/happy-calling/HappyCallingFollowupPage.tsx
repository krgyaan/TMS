import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { Save, PhoneCall, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import DateInput from '@/components/form/DateInput';
import { useClientDirectory } from '@/hooks/api/useClientDirectory';
import { useBroadcasts } from '@/hooks/api/useHappyCalling';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BroadcastAddDialog } from '@/modules/crm/happy-calling/components/BroadcastAddDialog';
import { toast } from 'sonner';

const formSchema = z.object({
    pointDiscussed: z.string().min(1, 'Point discussed is required').max(2000),
    callDateTime: z.string().optional().or(z.literal('')),
    nextFollowupDate: z.string().optional().or(z.literal('')),
    broadcastId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const inputCls =
    'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent ' +
    'px-3 py-1 text-sm outline-none focus-visible:border-ring ' +
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]';

const HappyCallingFollowupPage = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const parsedClientId = clientId ? parseInt(clientId, 10) : null;

    const { data: client, isLoading } = useClientDirectory(parsedClientId);
    const { data: broadcasts = [], isLoading: loadingBroadcasts } = useBroadcasts();

    const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = useState<number | undefined>(undefined);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            pointDiscussed: '',
            callDateTime: '',
            nextFollowupDate: '',
            broadcastId: undefined,
        },
    });

    const handleSubmit = async (values: FormValues) => {
        // Save logic into happy_calling will be wired up next
        console.log({ values, selectedBroadcast });
        toast.info('Saving to Happy Calling is not wired up yet');
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!parsedClientId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Client ID is required</AlertDescription>
            </Alert>
        );
    }

    if (!client) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Client not found</AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <PhoneCall className="h-5 w-5" /> Happy Calling
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Record a call and follow-up details for {client.name}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <h3 className="text-sm font-medium mb-3">Client Information</h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Organization</Label>
                                    <Input value={client.organization ?? ''} readOnly className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Name</Label>
                                    <Input value={client.name} readOnly className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Designation</Label>
                                    <Input value={client.designation ?? ''} readOnly className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Email</Label>
                                    <Input value={client.email ?? ''} readOnly className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Phone</Label>
                                    <Input value={client.phone ?? ''} readOnly className={inputCls} />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="callDateTime">Call Date/Time</Label>
                                <Input
                                    id="callDateTime"
                                    type="datetime-local"
                                    className={inputCls}
                                    {...form.register('callDateTime')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nextFollowupDate">Next Followup Date</Label>
                                <DateInput
                                    id="nextFollowupDate"
                                    value={form.watch('nextFollowupDate') || ''}
                                    onChange={(value) => form.setValue('nextFollowupDate', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Add to Broadcast List</Label>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={selectedBroadcast ? String(selectedBroadcast) : undefined}
                                        onValueChange={(value) => {
                                            setSelectedBroadcast(Number(value));
                                            form.setValue('broadcastId', Number(value));
                                        }}
                                        disabled={loadingBroadcasts}
                                    >
                                        <SelectTrigger className="h-9 flex-1">
                                            <SelectValue placeholder={loadingBroadcasts ? 'Loading broadcasts...' : 'Select a broadcast list'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {broadcasts.length === 0 && (
                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                    No broadcast lists yet
                                                </div>
                                            )}
                                            {broadcasts.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={() => setBroadcastDialogOpen(true)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pointDiscussed">Point Discussed *</Label>
                            <Textarea
                                id="pointDiscussed"
                                rows={4}
                                placeholder="Describe what was discussed during the call..."
                                {...form.register('pointDiscussed')}
                            />
                            {form.formState.errors.pointDiscussed && (
                                <p className="text-sm text-destructive">{form.formState.errors.pointDiscussed.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-4">
                            <Button type="button" variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button type="submit">
                                <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <BroadcastAddDialog
                open={broadcastDialogOpen}
                onOpenChange={setBroadcastDialogOpen}
                onCreated={(id) => {
                    setSelectedBroadcast(id);
                    form.setValue('broadcastId', id);
                }}
            />
        </>
    );
};

export default HappyCallingFollowupPage;