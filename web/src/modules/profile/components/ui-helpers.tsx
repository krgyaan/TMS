import React from "react";
import {
  FileCheck,
  FileClock,
  FileX,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export const getStatusConfig = (status: string) => {
  switch (status) {
    case "verified":
      return {
        label: "Verified",
        icon: FileCheck,
        className:
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    case "pending":
      return {
        label: "Pending",
        icon: FileClock,
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    case "rejected":
      return {
        label: "Rejected",
        icon: FileX,
        className:
          "bg-destructive/10 text-destructive border-destructive/20",
      };
    default:
      return {
        label: status,
        icon: Info,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

export const getNotificationIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <Clock className="h-4 w-4 text-amber-500" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};
