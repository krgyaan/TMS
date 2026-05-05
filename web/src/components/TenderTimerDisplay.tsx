import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface TenderTimerDisplayProps {
    remainingSeconds: number;
    status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE' | 'TIMER_NOT_FOUND' | 'STOPPED';
    deadline?: Date | null;
}

export const TenderTimerDisplay = ({
    remainingSeconds,
    status,
    deadline
}: TenderTimerDisplayProps) => {
    const isActiveTimer = status === 'RUNNING' || status === 'OVERDUE';
    const [displaySeconds, setDisplaySeconds] = useState(0);
    const [isOverdue, setIsOverdue] = useState(false);

    // Format time as HH:MM:SS
    const formatTime = (seconds: number) => {
        const absSeconds = Math.abs(Math.floor(seconds));
        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const secs = absSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Calculate time based on deadline
    const calculateTime = () => {
        if (!deadline) {
            return {
                seconds: Math.abs(remainingSeconds),
                overdue: remainingSeconds < 0
            };
        }

        const now = Date.now();
        const deadlineTime = new Date(deadline).getTime();
        const diff = deadlineTime - now;
        const seconds = Math.floor(diff / 1000);

        return {
            seconds: Math.abs(seconds),
            overdue: diff < 0
        };
    };

    // Initial calculation and interval setup
    useEffect(() => {
        if (!isActiveTimer) {
            // For non-active timers, just use remainingSeconds
            setDisplaySeconds(Math.abs(remainingSeconds));
            setIsOverdue(remainingSeconds < 0);
            return;
        }

        // Calculate immediately
        const { seconds, overdue } = calculateTime();
        setDisplaySeconds(seconds);
        setIsOverdue(overdue);

        // Update every second
        const intervalId = setInterval(() => {
            const { seconds, overdue } = calculateTime();
            setDisplaySeconds(seconds);
            setIsOverdue(overdue);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [deadline, remainingSeconds, isActiveTimer, status]);

    const getDisplay = () => {
        const isPositive = !isOverdue;
        const colorClass = isPositive ? "text-emerald-400" : "text-destructive";
        const badgeVariant = isPositive ? "success" : "destructive";

        if (status === 'TIMER_NOT_FOUND') {
            return <span className="text-muted-foreground italic text-[10px]">Timer N/A</span>;
        }

        if (isActiveTimer) {
            return (
                <Badge 
                    variant="outline" 
                    className={`${colorClass} font-mono border-current bg-transparent`}
                >
                    {formatTime(displaySeconds)}
                </Badge>
            );
        }

        switch (status) {
            case 'COMPLETED':
            case 'STOPPED':
                return (
                    <Badge variant={badgeVariant as any} className="font-mono">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {formatTime(displaySeconds)}
                    </Badge>
                );
            case 'PAUSED':
                return (
                    <Badge variant="secondary" className="font-mono">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(displaySeconds)}
                    </Badge>
                );
            default:
                return <span className="text-muted-foreground text-xs">Not started</span>;
        }
    };

    return getDisplay();
};
