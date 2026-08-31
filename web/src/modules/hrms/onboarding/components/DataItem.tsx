import React from "react";

export const DataItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="text-sm font-medium text-foreground pl-5">
      {value || (
        <span className="text-muted-foreground/40 font-normal italic">
          Not provided
        </span>
      )}
    </div>
  </div>
);
