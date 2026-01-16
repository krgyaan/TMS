import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, PauseCircle, Clock } from "lucide-react";
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

interface TenderTimerDisplayProps {
    remainingSeconds: number;
    status: TimerStatus;
    stepKey?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

const stepNames: Record<string, string> = {
    'tender_info': 'Tender Info',
    'tender_approval': 'Approval',
    'emd_submission': 'EMD Submission',
    'bid_preparation': 'Bid Preparation',
    'bid_submission': 'Bid Submission',
    'courier': 'Courier',
    'document_verification': 'Document Verification'
};

export const TenderTimerDisplay = ({
    remainingSeconds,
    status,
    stepKey = 'current_step',
    size = 'md',
    showLabel = false
}: TenderTimerDisplayProps) => {
    const [timeLeft, setTimeLeft] = useState(remainingSeconds);

    // Format time as HH:MM:SS
    const formatTime = (seconds: number) => {
        const isNegative = seconds < 0;
        const absSeconds = Math.abs(seconds);

        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const secs = absSeconds % 60;

        return {
            display: `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
            isNegative
        };
    };

    // Get color based on status
    const getColor = () => {
        switch (status) {
            case 'OVERDUE': return 'text-red-500';
            case 'RUNNING':
                return timeLeft > 0 ? 'text-green-600' : 'text-yellow-500';
            case 'PAUSED': return 'text-gray-500';
            case 'COMPLETED': return 'text-blue-500';
            default: return 'text-gray-400';
        }
    };

    // Update timer every second
    useEffect(() => {
        setTimeLeft(remainingSeconds);

        if (status !== 'RUNNING') return;

        const startTime = Date.now();
        const initialTime = remainingSeconds;

        let animationFrameId: number;

        const update = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setTimeLeft(initialTime - elapsed);
            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [remainingSeconds, status]);

    const { display, isNegative } = formatTime(timeLeft);
    const stepName = stepNames[stepKey] || stepKey.replace(/_/g, ' ');

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                    <span className={`${getColor()} font-mono`}>
                        {display}
                    </span>
                    {showLabel && <span className="text-xs text-gray-500">{stepName}</span>}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-medium">{stepName}</p>
                <p className="text-sm text-muted-foreground">
                    {status === 'OVERDUE' ? 'Overdue by' : 'Time remaining:'} {display}
                </p>
                {status === 'RUNNING' && timeLeft <= 0 && (
                    <p className="text-sm text-yellow-500">Timer has expired</p>
                )}
            </TooltipContent>
        </Tooltip>
    );
};
