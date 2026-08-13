import { useParams, useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { paths } from "@/app/routes/paths";
import { useInsurancePolicy } from "@/hooks/api/useInsurancePolicies";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { format } from "date-fns";

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Active: 'default',
    'Expiring Soon': 'secondary',
    Expired: 'destructive',
};

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value ?? '—'}</p>
    </div>
);

const FileList = ({ label, files }: { label: string; files?: string[] | null }) => {
    if (!files || files.length === 0) return null;
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex flex-wrap gap-2">
                {files.map((filePath, i) => (
                    <Button key={i} variant="outline" size="sm" asChild>
                        <a href={tenderFilesService.getFileUrl(filePath)} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" /> File {i + 1}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
    );
};

const InsuranceViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const policyId = Number(id);
    const navigate = useNavigate();
    const { data: policy, isLoading, error } = useInsurancePolicy(policyId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !policy) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load insurance policy.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardAction className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => navigate(paths.accounts.insuranceEdit(policy.id))}>
                        <Edit className="h-4 w-4" /> Edit
                    </Button>
                </CardAction>
                <CardTitle>Insurance Policy #{policy.id}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[policy.status] ?? 'outline'}>{policy.status}</Badge>
                    <span>{policy.daysRemaining} days remaining</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Field label="Insurance Type" value={<Badge variant="outline">{policy.insuranceType}</Badge>} />
                    <Field label="Policy Number" value={policy.policyNumber} />
                    <Field label="Insurer Name" value={policy.insurerName} />
                    <Field label="Start Date" value={policy.startDate ? format(new Date(policy.startDate), "dd MMM yyyy") : undefined} />
                    <Field label="End Date" value={policy.endDate ? format(new Date(policy.endDate), "dd MMM yyyy") : undefined} />
                    <Field label="Sum Assured" value={policy.sumAssured ? Number(policy.sumAssured).toLocaleString("en-IN", { style: "currency", currency: "INR" }) : undefined} />
                    <Field label="Project Name" value={policy.projectName} />
                    <Field label="Linked Request" value={policy.linkedRequest} />
                    <Field label="Created By" value={policy.createdByName} />
                    {policy.noOfManpower != null && <Field label="No. of Manpower" value={policy.noOfManpower} />}
                    {policy.manpowerNames && <Field label="Manpower Covered" value={policy.manpowerNames} />}
                    {policy.location && <Field label="Location" value={policy.location} />}
                    {policy.itemsCovered && <Field label="Items Covered" value={policy.itemsCovered} />}
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileList label="Policy Document" files={policy.policyDocument} />
                    <FileList label="LR Copy" files={policy.lrCopy} />
                </div>
            </CardContent>
        </Card>
    );
};

export default InsuranceViewPage;