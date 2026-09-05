import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border/50 bg-card/50">
    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
      <Skeleton className="h-3.5 w-44" />
      <Skeleton className="h-3 w-60" />
    </div>
    <Skeleton className="h-3 w-28 hidden lg:block" />
    <Skeleton className="h-6 w-20 hidden md:block" />
  </div>
);

export const TaskRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50">
    <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-2.5 w-36" />
    </div>
    <Skeleton className="h-5 w-14 rounded-lg" />
  </div>
);
