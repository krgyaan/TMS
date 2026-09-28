import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
    useSetVendorOrganizationStatus,
    useVendorOrganizationWithRelations,
} from "@/hooks/api/useVendorOrganizations";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Pencil, Power, PowerOff, ShieldAlert } from "lucide-react";
import { useLayoutEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AccountSection } from "./components/AccountSection";
import { FileSection } from "./components/FileSection";
import { GstSection } from "./components/GstSection";
import { PersonSection } from "./components/PersonSection";
import { vendorOrgToFormValues } from "./helpers/vendorForm.mappers";
import { VendorFormSchema, type VendorFormValues } from "./helpers/vendorForm.schema";
import { vendorAreaBase } from "./vendorAreaPath";

const PERMISSION_MODULE = "master.vendors";

type VendorViewTab = "gsts" | "accounts" | "persons" | "files";

const emptyVendorForm: VendorFormValues = {
    organization: { name: "", alias: "", msme: "", pan: "", address: "", status: true },
    gsts: [],
    accounts: [],
    persons: [],
    files: [],
};

const VendorViewPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const { id } = useParams<{ id: string }>();
    const orgId = id ? parseInt(id) : null;

    const { canRead, canUpdate } = useAuth();
    const { data: organization, isLoading, error } = useVendorOrganizationWithRelations(orgId);
    const setVendorStatus = useSetVendorOrganizationStatus();

    const { activeTab, setActiveTab } = usePersistentTableState<VendorViewTab>({
        storageKey: "vendor-master-view",
        defaultTab: "gsts",
    });

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema),
        defaultValues: emptyVendorForm,
    });

    // Layout effect so the form (and the tab counts derived from it) is seeded
    // before paint — avoids a one-frame "0" flash while the record loads.
    useLayoutEffect(() => {
        if (organization) {
            form.reset(vendorOrgToFormValues(organization));
        }
    }, [organization, form]);

    if (!canRead(PERMISSION_MODULE)) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to view vendor master records.
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

    const counts = {
        gsts: form.watch("gsts").length,
        accounts: form.watch("accounts").length,
        persons: form.watch("persons").length,
        files: form.watch("files").length,
    };

    const detailRows: [string, ReactNode][] = [
        ["Organization Name", organization.name || "-"],
        ["Alias", organization.alias || "-"],
        ["PAN", organization.pan || "-"],
        ["MSME", organization.msme || "-"],
        ["Address", organization.address || "-"],
        [
            "Status",
            <Badge key="status" variant={organization.status ? "default" : "secondary"}>
                {organization.status ? "Active" : "Inactive"}
            </Badge>,
        ],
        ["Created At", formatDateTime(organization.createdAt)],
        ["Updated At", formatDateTime(organization.updatedAt)],
    ];

    const handleToggleStatus = async () => {
        const next = !organization.status;
        const confirmed = window.confirm(
            next
                ? `Activate "${organization.name}"? It will be selectable as a seller in new PO/VWOs.`
                : `Deactivate "${organization.name}"? It will be hidden from new PO/VWO seller selection. Existing records stay intact.`,
        );
        if (!confirmed) return;
        try {
            await setVendorStatus.mutateAsync({ id: organization.id, status: next });
        } catch {
            // Error toast handled in the hook
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight truncate">{organization.name}</h1>
                        <Badge variant={organization.status ? "default" : "secondary"}>
                            {organization.status ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2">Vendor organization details and related entities</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" onClick={() => navigate(basePath)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    {canUpdate(PERMISSION_MODULE) && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => navigate(`${basePath}/${organization.id}/edit`)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button variant="outline" onClick={handleToggleStatus} disabled={setVendorStatus.isPending}>
                                {organization.status ? (
                                    <>
                                        <PowerOff className="h-4 w-4 mr-2" />
                                        Deactivate
                                    </>
                                ) : (
                                    <>
                                        <Power className="h-4 w-4 mr-2" />
                                        Activate
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Organization details — two-column field/value table */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                    <CardDescription>All vendor organization fields</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-56">Field</TableHead>
                                <TableHead>Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detailRows.map(([label, value]) => (
                                <TableRow key={label}>
                                    <TableCell className="font-medium text-muted-foreground align-top">
                                        {label}
                                    </TableCell>
                                    <TableCell className="align-top break-words">{value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Related entities — one tab per section, persisted across reload */}
            <Card>
                <CardHeader>
                    <CardTitle>Related Entities</CardTitle>
                    <CardDescription>GST numbers, bank accounts, persons and files</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs
                        value={activeTab}
                        onValueChange={value => setActiveTab(value as VendorViewTab)}
                        className="w-full"
                    >
                        <TabsList>
                            <TabsTrigger value="gsts">GST Numbers ({counts.gsts})</TabsTrigger>
                            <TabsTrigger value="accounts">Bank Accounts ({counts.accounts})</TabsTrigger>
                            <TabsTrigger value="persons">Persons ({counts.persons})</TabsTrigger>
                            <TabsTrigger value="files">Files ({counts.files})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="gsts" className="mt-4">
                            <GstSection orgId={orgId} />
                        </TabsContent>

                        <TabsContent value="accounts" className="mt-4">
                            <AccountSection orgId={orgId} />
                        </TabsContent>

                        <TabsContent value="persons" className="mt-4">
                            <PersonSection orgId={orgId} />
                        </TabsContent>

                        <TabsContent value="files" className="mt-4">
                            <FileSection orgId={orgId} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default VendorViewPage;
