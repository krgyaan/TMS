import React from "react";

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </p>
                <p className="text-xl font-bold tabular-nums tracking-tight">
                    {value || "-"}
                </p>
            </div>
            {icon && (
                <div className="rounded-lg bg-primary/10 p-2">
                    {icon}
                </div>
            )}
        </div>
    </div>
);
