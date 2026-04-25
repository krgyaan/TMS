import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface TenderTimerDisplayProps {
    remainingSeconds: number;
    status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE';
    deadline?: Date | null; // Required for accurate overdue calculation
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

    const formatShortTime = (seconds: number) => {
        const absSeconds = Math.abs(Math.floor(seconds));
        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Calculate time based on deadline
    const calculateTime = () => {
        if (!deadline) {
            return {
                seconds: remainingSeconds,
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
    }, [deadline, remainingSeconds, isActiveTimer]);

    const getDisplay = () => {
        if (isActiveTimer) {
            if (isOverdue) {
                // OVERDUE: Stopwatch counting UP from deadline
                // Shows how long past the deadline (now - deadline_at)
                return (
                    <Badge
                        variant="secondary"
                        className="text-destructive font-mono"
                    >
                        {formatTime(displaySeconds)}
                    </Badge>
                );
            }

            // Normal countdown: time remaining until deadline
            return (
                <Badge variant="outline" className="text-emerald-400 font-mono">
                    {formatTime(displaySeconds)}
                </Badge>
            );
        }

        switch (status) {
            case 'COMPLETED':
                return (
                    <Badge variant={isOverdue ? "destructive" : "success"}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {isOverdue ? '+' : ''}{formatShortTime(displaySeconds)}
                    </Badge>
                );
            case 'PAUSED':
                return (
                    <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatShortTime(displaySeconds)}
                    </Badge>
                );
            default:
                return <span className="text-muted-foreground">Not started</span>;
        }
    };

    return getDisplay();
};
