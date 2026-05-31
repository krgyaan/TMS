import React from "react";
import { AlertCircle, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "../components/StatCard";
import { formatINR } from "@/hooks/useINRFormatter";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";

interface ProjectOverviewSectionProps {
    projectId: number | null;
}

export const ProjectOverviewSection: React.FC<ProjectOverviewSectionProps> = ({
    projectId,
}) => {
    const { data, isLoading } = useProjectOverview(projectId!);

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const woBasicDetail = data?.woBasicDetail ?? {};

    return (
        <>
            {/* Tender Not Linked Alert */}
            {data && !data?.tender && (
                <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm group-hover:scale-105 transition-transform">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">Tender Not Linked</h3>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
                                    Action Required
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                This project does not have a linked tender record. Linking a tender is essential for accurate budget tracking, compliance monitoring, and automated work order generation.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden md:flex gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <Edit className="h-4 w-4" />
                            Link Tender
                        </Button>
                    </div>
                    <div className="absolute -right-10 -bottom-6 opacity-[0.03] text-foreground pointer-events-none">
                        <AlertCircle size={120} />
                    </div>
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base font-semibold">
                            Project Overview
                        </CardTitle>
                        <CardDescription>
                            Financial summary and key metrics
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="WO Value (Pre GST)"
                            value={woBasicDetail?.woValuePreGst
                                ? formatINR(Number(woBasicDetail?.woValuePreGst))
                                : "-"}
                        />
                        <StatCard
                            label="WO Value (GST)"
                            value={woBasicDetail?.woValueGstAmt
                                ? formatINR(Number(woBasicDetail?.woValueGstAmt))
                                : "-"}
                        />
                        <StatCard
                            label="Total Budget"
                            value={woBasicDetail?.budget
                                ? formatINR(Number(woBasicDetail?.budget))
                                : "-"}
                        />
                        <StatCard
                            label="Expenses Done"
                            value={woBasicDetail?.expenses_done
                                ? formatINR(Number(woBasicDetail?.expenses_done))
                                : "-"}
                        />
                        <StatCard
                            label="PO Raised"
                            value={woBasicDetail?.poRaised
                                ? formatINR(Number(woBasicDetail?.poRaised))
                                : "-"}
                        />
                        <StatCard
                            label="WO Raised"
                            value={woBasicDetail?.woRaised
                                ? formatINR(Number(woBasicDetail?.woRaised))
                                : "-"}
                        />
                        <StatCard label="Planned GP" value="-" />
                        <StatCard label="Actual GP" value="-" />
                        
                        <StatCard
                            label="Budget for Supply"
                            value={woBasicDetail?.budgetSupply
                                ? formatINR(Number(woBasicDetail?.budgetSupply))
                                : "-"}
                        />
                        <StatCard
                            label="Budget for Service"
                            value={woBasicDetail?.budgetService
                                ? formatINR(Number(woBasicDetail?.budgetService))
                                : "-"}
                        />
                        <StatCard
                            label="Budget for Freight"
                            value={woBasicDetail?.budgetFreight
                                ? formatINR(Number(woBasicDetail?.budgetFreight))
                                : "-"}
                        />
                        <StatCard
                            label="Budget for Admin/Misc."
                            value={woBasicDetail?.budgetAdmin
                                ? formatINR(Number(woBasicDetail?.budgetAdmin))
                                : "-"}
                        />
                        <StatCard
                            label="Budget for Buyback/Sale"
                            value={woBasicDetail?.budgetBuybackSale
                                ? formatINR(Number(woBasicDetail?.budgetBuybackSale))
                                : "-"}
                        />
                        <StatCard
                            label="GEM Charges"
                            value={woBasicDetail?.budgetGemCharges
                                ? formatINR(Number(woBasicDetail?.budgetGemCharges))
                                : "-"}
                        />
                    </div>
                </CardContent>
            </Card>
        </>
    );
};
