import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { differenceInSeconds } from "date-fns";

// ==================== Timer Component ====================
const Timer: React.FC<{ dueDate: string; isSaturday?: boolean }> = ({ dueDate, isSaturday = false }) => {
    const [timeLeft, setTimeLeft] = React.useState<number>(0);

    React.useEffect(() => {
        const calculateTimeLeft = () => {
            let targetDate = new Date(dueDate);
            if (isSaturday) {
                targetDate.setDate(targetDate.getDate() + 2);
            }
            const now = new Date();
            const secondsLeft = differenceInSeconds(targetDate, now);
            setTimeLeft(secondsLeft);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [dueDate, isSaturday]);

    const formatTime = (seconds: number) => {
        const isNegative = seconds < 0;
        const absSeconds = Math.abs(seconds);
        const days = Math.floor(absSeconds / 86400);
        const hours = Math.floor((absSeconds % 86400) / 3600);
        const mins = Math.floor((absSeconds % 3600) / 60);
        const secs = absSeconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0) parts.push(`${mins}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return `${isNegative ? "-" : ""}${parts.join(" ")}`;
    };

    const isOverdue = timeLeft < 0;

    return (
        <Badge variant={isOverdue ? "destructive" : "secondary"} className="font-mono text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(timeLeft)}
        </Badge>
    );
};

export default Timer;
