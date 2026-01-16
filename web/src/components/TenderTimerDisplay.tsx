import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface TenderTimerDisplayProps {
    remainingSeconds: number;
    status: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE';
}

export const TenderTimerDisplay = ({
    remainingSeconds,
    status
}: TenderTimerDisplayProps) => {
    const isRunning = status === 'RUNNING';
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
            shortDisplay: `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
            isNegative
        };
    };

    const formattedTime = formatTime(remainingSeconds);

    useEffect(() => {
        setTimeLeft(remainingSeconds);

        if (!isRunning) return;

        const startTime = Date.now();
        const initialTime = remainingSeconds;

        const update = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setTimeLeft(initialTime - elapsed);
        };

        // Use requestAnimationFrame for smoother updates
        let animationFrameId: number;
        const animate = () => {
            update();
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [remainingSeconds, isRunning]);

    // Get display component based on status
    const getDisplay = () => {
        switch (status) {
            case 'RUNNING':
                return (
                    <Badge variant="outline" className={timeLeft < 0 ? "text-danger" : "text-emerald-400"}>
                        {formatTime(timeLeft).display}
                    </Badge>
                );
            case 'COMPLETED':
                return (
                    <Badge variant={formattedTime.isNegative ? "destructive" : "success"}>
                        <CheckCircle />
                        {formattedTime.shortDisplay}
                    </Badge>
                );
            case 'OVERDUE':
                return (
                    <Badge variant="destructive">
                        <AlertTriangle />
                        {formattedTime.shortDisplay}
                    </Badge>
                );
            case 'PAUSED':
                return (
                    <Badge variant="secondary">
                        <Clock />
                        {formattedTime.shortDisplay}
                    </Badge>
                );
            default:
                return <span className="text-muted-foreground">Not started</span>;
        }
    };

    return (
        <>
            <span className="hidden">{remainingSeconds}</span>
            {getDisplay()}
        </>
    );
};
