import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface TenderTimerDisplayProps {
    remainingSeconds: number;
    status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE';
    deadline?: string;
}

export const TenderTimerDisplay = ({
    remainingSeconds,
    status,
    deadline
}: TenderTimerDisplayProps) => {
    // Treat OVERDUE as still running
    const isActiveTimer = status === 'RUNNING' || status === 'OVERDUE';
    const [timeLeft, setTimeLeft] = useState(remainingSeconds);
    const startTimeRef = useRef<number>(Date.now());
    const initialTimeRef = useRef<number>(remainingSeconds);

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

    // Calculate time from deadline if available
    useEffect(() => {
        if (deadline && isActiveTimer) {
            const deadlineTime = new Date(deadline).getTime();
            const now = Date.now();
            const calculatedRemaining = Math.floor((deadlineTime - now) / 1000);
            setTimeLeft(calculatedRemaining);
            initialTimeRef.current = calculatedRemaining;
            startTimeRef.current = now;
        } else {
            setTimeLeft(remainingSeconds);
            initialTimeRef.current = remainingSeconds;
            startTimeRef.current = Date.now();
        }
    }, [remainingSeconds, deadline, isActiveTimer]);

    // Countdown/Countup effect
    useEffect(() => {
        if (!isActiveTimer) return;

        const intervalId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const newTimeLeft = initialTimeRef.current - elapsed;
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isActiveTimer]);

    const isOverdue = timeLeft < 0;
    // Convert negative time to positive for stopwatch display
    const overdueSeconds = Math.abs(timeLeft);

    const getDisplay = () => {
        if (isActiveTimer) {
            if (isOverdue) {
                // OVERDUE: Show as stopwatch counting UP in red
                return (
                    <Badge
                        variant="outline"
                        className="font-mono border-destructive text-destructive"
                    >
                        {formatTime(overdueSeconds)}
                    </Badge>
                );
            }

            // Normal countdown
            return (
                <Badge variant="outline" className="text-emerald-400 font-mono">
                    {formatTime(timeLeft)}
                </Badge>
            );
        }

        switch (status) {
            case 'COMPLETED':
                const completedOverdue = remainingSeconds < 0;
                return (
                    <Badge variant={completedOverdue ? "destructive" : "success"}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {completedOverdue ? '+' : ''}{formatShortTime(remainingSeconds)}
                    </Badge>
                );
            case 'PAUSED':
                return (
                    <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatShortTime(timeLeft)}
                    </Badge>
                );
            default:
                return <span className="text-muted-foreground">Not started</span>;
        }
    };

    return getDisplay();
};
