import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorFilesByOrg, vendorFilesKey } from "@/hooks/api/useVendorFiles";
import { useVendorOrganizationWithRelations, vendorOrganizationsKey } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { AlertCircle, ArrowLeft, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { MsmeBadge } from "@/modules/master/vendor-master/helpers/MsmeBadge";
import { FileFormDialog } from "@/modules/master/vendor-master/components/FileFormDialog";
import { paths } from "@/app/routes/paths";
import { VendorRelationTables, type VendorRelationTab } from "./VendorRelationTables";

const PERMISSION_MODULE = "document-dashboard.vendors";
const ADMIN_PERMISSION_MODULE = "master.vendors";

const StatusBadge = ({ status }: { status?: boolean | null }) =>
    status === false ? (
        <Badge variant="secondary">Inactive</Badge>
    ) : (
        <Badge variant="default">Active</Badge>
    );

const VendorDirectoryShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const orgId = id ? parseInt(id) : null;

    const { canRead, canCreate } = useAuth();
    const queryClient = useQueryClient();

    const { data: organization, isLoading, error } = useVendorOrganizationWithRelations(orgId);
    const { data: files } = useVendorFilesByOrg(orgId);

    const [fileDialogOpen, setFileDialogOpen] = useState(false);

    const { activeTab, setActiveTab } = usePersistentTableState<VendorRelationTab>({
        storageKey: "vendor-directory-view",
        defaultTab: "gsts",
    });

    const canView = canRead(PERMISSION_MODULE) || canRead(ADMIN_PERMISSION_MODULE);
    const canUploadFiles = canCreate(PERMISSION_MODULE) || canCreate(ADMIN_PERMISSION_MODULE);

    const handleFileSaved = () => {
        if (!orgId) return;
        // Refresh the org payload (all tabs) and the focused files list.
        queryClient.invalidateQueries({ queryKey: vendorOrganizationsKey.detail(orgId) });
        queryClient.invalidateQueries({ queryKey: vendorFilesKey.byOrg(orgId) });
    };

    if (!canView) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to view the vendor directory.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !organization || !orgId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Error loading vendor organization: {error?.message || "Not found"}
                </AlertDescription>
            </Alert>
        );
    }

    const gsts = organization.gsts ?? [];
    const accounts = organization.accounts ?? [];
    const persons = organization.persons ?? [];
    const orgFiles = files ?? organization.files ?? [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{organization.name}</CardTitle>
                    <CardDescription>Read-only vendor details</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" onClick={() => navigate(paths.documentDashboard.vendors)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium text-muted-foreground align-top">Organization Name</TableCell>
                                <TableCell className="align-top break-words">{organization.name || "-"}</TableCell>
                                <TableCell className="font-medium text-muted-foreground align-top">Alias</TableCell>
                                <TableCell className="align-top break-words">{organization.alias || "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-muted-foreground align-top">PAN</TableCell>
                                <TableCell className="align-top break-words">{organization.pan || "-"}</TableCell>
                                <TableCell className="font-medium text-muted-foreground align-top">MSME</TableCell>
                                <TableCell className="align-top break-words">
                                    <MsmeBadge msme={organization.msme} msmeType={organization.msmeType} />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-muted-foreground align-top">Address</TableCell>
                                <TableCell className="align-top break-words" colSpan={3}>{organization.address || "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-muted-foreground align-top">Status</TableCell>
                                <TableCell className="align-top break-words" colSpan={3}>
                                    <StatusBadge status={organization.status} />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Related Entities</CardTitle>
                    <CardDescription>GST numbers, bank accounts, persons and files</CardDescription>
                </CardHeader>
                <CardContent>
                    <VendorRelationTables
                        gsts={gsts}
                        accounts={accounts}
                        persons={persons}
                        files={orgFiles}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        filesHeaderAction={
                            canUploadFiles ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setFileDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add File
                                </Button>
                            ) : undefined
                        }
                    />
                </CardContent>
            </Card>

            <FileFormDialog
                orgId={orgId}
                open={fileDialogOpen}
                onOpenChange={setFileDialogOpen}
                initial={null}
                onSaved={handleFileSaved}
            />
        </div>
    );
};

export default VendorDirectoryShowPage;
