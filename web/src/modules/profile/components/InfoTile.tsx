import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InfoTileProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  badge?: boolean;
}

export const InfoTile: React.FC<InfoTileProps> = ({
  icon: Icon,
  label,
  value,
  mono,
  badge,
}) => (
  <div className="group relative p-3.5 rounded-2xl border border-border/50 bg-card/80 hover:bg-card hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 ease-out">
    <div className="flex items-center gap-3.5">
      <div className="p-2.5 rounded-xl bg-primary/5 text-primary/70 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 ease-out group-hover:shadow-lg group-hover:shadow-primary/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70 font-semibold mb-0.5">
          {label}
        </p>
        {badge ? (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 text-xs"
          >
            {value || "-"}
          </Badge>
        ) : (
          <p
            className={cn(
              "text-sm font-semibold truncate text-foreground/90",
              mono && "font-mono tracking-wider text-xs"
            )}
          >
            {value || "-"}
          </p>
        )}
      </div>
    </div>
  </div>
);
