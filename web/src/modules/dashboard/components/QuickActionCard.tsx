import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickAction } from "../helpers/dashboard.constants";

interface QuickActionCardProps extends QuickAction {
    onClick: () => void;
}

export const QuickActionCard = ({ icon: Icon, title, subtitle, color, bgColor, onClick }: QuickActionCardProps) => (
    <button
        onClick={onClick}
        className="group relative flex flex-col items-start p-4 bg-background border border-border/50 rounded-2xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden text-left w-full"
    >
        <div className="flex gap-2 items-center">
            <div className={cn("mb-3 p-2.5 rounded-xl transition-colors duration-300", bgColor, color)}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
            </div>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
    </button>
);