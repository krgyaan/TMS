import React from "react";
import { ListChecks, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeeInductionTab } from "../helpers/induction.helpers";

export const EmptyState: React.FC<{ search: string; tab: EmployeeInductionTab }> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
      <ListChecks className="h-8 w-8 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-semibold">
      {search ? "No matching employees" : `No ${tab === "all" ? "" : tab.replace(/_/g, " ")} inductions`}
    </p>
    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for induction tracking."}
    </p>
  </div>
);

export const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
      <AlertTriangle className="h-8 w-8 text-destructive/50" />
    </div>
    <p className="text-sm font-semibold">Failed to load induction data</p>
    <p className="text-xs text-muted-foreground mt-1.5 mb-5">
      There was an error fetching data from the server.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
      Try Again
    </Button>
  </div>
);
