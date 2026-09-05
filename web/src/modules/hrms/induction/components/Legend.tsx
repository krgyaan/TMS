import React from "react";
import { Milestone, CheckCheck } from "lucide-react";

export const Legend: React.FC = () => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
    <div className="flex items-center gap-1">
      <Milestone className="h-3 w-3" />
      <span className="text-[10px]">Before</span>
    </div>
    <div className="flex items-center gap-1">
      <CheckCheck className="h-3 w-3" />
      <span className="text-[10px]">After</span>
    </div>
  </div>
);
