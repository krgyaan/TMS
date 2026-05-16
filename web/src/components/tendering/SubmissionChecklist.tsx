import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FastForward, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckpointStatus = 'fulfilled' | 'pending' | 'na';

export interface Checkpoint {
    id: string;
    label: string;
    status: CheckpointStatus;
    description?: string;
}

interface SubmissionChecklistProps {
    checkpoints: Checkpoint[];
    title?: string;
    className?: string;
}

export function SubmissionChecklist({
    checkpoints,
    title = "Submission Checklist",
    className
}: SubmissionChecklistProps) {
    const allFulfilled = checkpoints.every(cp => cp.status === 'fulfilled' || cp.status === 'na');

    return (
        <Card className={cn("mb-6 border-l-4", allFulfilled ? "border-l-green-500" : "border-l-amber-500", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className={cn("h-5 w-5", allFulfilled ? "text-green-500" : "text-amber-500")} />
                        {title}
                    </CardTitle>
                    {!allFulfilled && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse">
                            Action Required
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {checkpoints.map((cp) => (
                        <div 
                            key={cp.id} 
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-md border transition-colors",
                                cp.status === 'fulfilled' && "border-green-100",
                                cp.status === 'pending' && "border-red-100",
                                cp.status === 'na' && "border-slate-100 opacity-70"
                            )}
                        >
                            <div className="mt-0.5">
                                {cp.status === 'fulfilled' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                {cp.status === 'pending' && <XCircle className="h-5 w-5 text-red-600" />}
                                {cp.status === 'na' && <FastForward className="h-5 w-5 text-slate-400" />}
                            </div>
                            <div>
                                <p className={cn(
                                    "text-sm font-semibold",
                                    cp.status === 'fulfilled' && "text-green-900",
                                    cp.status === 'pending' && "text-red-900",
                                    cp.status === 'na' && "text-slate-500"
                                )}>
                                    {cp.label}
                                </p>
                                {cp.status === 'na' ? (
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Not Applicable</p>
                                ) : cp.status === 'fulfilled' ? (
                                    <p className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Completed</p>
                                ) : (
                                    <p className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Pending</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
