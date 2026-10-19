import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorFilesByOrg, vendorFilesKey } from "@/hooks/api/useVendorFiles";
import { useVendorOrganizationWithRelations, vendorOrganizationsKey } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { fileUploadService } from "@/services/api/file-upload.service";
import { AlertCircle, ArrowLeft, FileText, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { MsmeBadge } from "@/modules/master/vendor-master/helpers/MsmeBadge";
import { FileFormDialog } from "@/modules/master/vendor-master/components/FileFormDialog";
import { paths } from "@/app/routes/paths";

const PERMISSION_MODULE = "document-dashboard.vendors";
const ADMIN_PERMISSION_MODULE = "master.vendors";

type VendorDirectoryTab = "gsts" | "accounts" | "persons" | "files";

const StatusBadge = ({ status }: { status?: boolean | null }) =>
    status === false ? (
        <Badge variant="secondary">Inactive</Badge>
    ) : (
        <Badge variant="default">Active</Badge>
    );

const EmptyRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
        <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
            No records found.
        </TableCell>
    </TableRow>
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

    const { activeTab, setActiveTab } = usePersistentTableState<VendorDirectoryTab>({
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
                    <Tabs
                        value={activeTab}
                        onValueChange={value => setActiveTab(value as VendorDirectoryTab)}
                        className="w-full"
                    >
                        <TabsList>
                            <TabsTrigger value="gsts">GST Numbers ({gsts.length})</TabsTrigger>
                            <TabsTrigger value="accounts">Bank Accounts ({accounts.length})</TabsTrigger>
                            <TabsTrigger value="persons">Persons ({persons.length})</TabsTrigger>
                            <TabsTrigger value="files">Files ({orgFiles.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="gsts" className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>GST State</TableHead>
                                        <TableHead>GST Number</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gsts.length === 0 ? (
                                        <EmptyRow colSpan={4} />
                                    ) : (
                                        gsts.map(gst => (
                                            <TableRow key={gst.id}>
                                                <TableCell>{gst.gstState || "-"}</TableCell>
                                                <TableCell className="break-all">{gst.gstNo || "-"}</TableCell>
                                                <TableCell className="break-words">{gst.address || "-"}</TableCell>
                                                <TableCell><StatusBadge status={gst.status} /></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="accounts" className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead>Account Number</TableHead>
                                        <TableHead>IFSC</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accounts.length === 0 ? (
                                        <EmptyRow colSpan={4} />
                                    ) : (
                                        accounts.map(account => (
                                            <TableRow key={account.id}>
                                                <TableCell>{account.bankAccountName || "-"}</TableCell>
                                                <TableCell className="break-all">{account.accountNum || "-"}</TableCell>
                                                <TableCell className="break-all">{account.ifscCode || "-"}</TableCell>
                                                <TableCell><StatusBadge status={account.status} /></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="persons" className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Mobile</TableHead>
                                        <TableHead>Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {persons.length === 0 ? (
                                        <EmptyRow colSpan={4} />
                                    ) : (
                                        persons.map(person => (
                                            <TableRow key={person.id}>
                                                <TableCell>{person.name || "-"}</TableCell>
                                                <TableCell className="break-all">{person.email || "-"}</TableCell>
                                                <TableCell className="break-all">{person.mobile || "-"}</TableCell>
                                                <TableCell className="break-words">{person.address || "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="files" className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm text-muted-foreground">
                                    {canUploadFiles
                                        ? "You can upload supporting documents for this vendor."
                                        : "Uploaded vendor documents."}
                                </div>

                                {canUploadFiles && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setFileDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add File
                                    </Button>
                                )}
                            </div>

                            {orgFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                    <FileText className="h-10 w-10 mb-3" />
                                    <p className="text-sm">No files uploaded yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orgFiles.map(file => (
                                        <Card key={file.id} className="p-4">
                                            <div className="font-medium">{file.name}</div>
                                            <a
                                                href={fileUploadService.getFileUrl(file.filePath)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 underline break-all"
                                            >
                                                {file.filePath}
                                            </a>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
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
