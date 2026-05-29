import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "../components/StatCard";
import { formatINR } from "@/hooks/useINRFormatter";
import { paths } from "@/app/routes/paths";
import { useNavigate } from "react-router-dom";

interface ProjectOverviewSectionProps {
    projectId: number;
    projectDetails: any;
}

export const ProjectOverviewSection: React.FC<ProjectOverviewSectionProps> = ({
    projectId,
    projectDetails,
}) => {
    const navigate = useNavigate();
    const woBasicDetail = projectDetails?.woBasicDetail ?? {};

    return (
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
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(paths.operations.raisePoForm(projectId))}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Raise PO
                    </Button>
                    <Button size="sm" variant="outline">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Raise WO
                    </Button>
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
                </div>
            </CardContent>
        </Card>
    );
};
