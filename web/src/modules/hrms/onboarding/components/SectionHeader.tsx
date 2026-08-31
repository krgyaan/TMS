import React from "react";
import { Badge } from "@/components/ui/badge";

export const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  count?: number;
}> = ({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {count !== undefined && (
      <Badge
        variant="secondary"
        className="text-[10px] font-semibold rounded-full"
      >
        {count}
      </Badge>
    )}
  </div>
);
