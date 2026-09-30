import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSetVendorOrganizationStatus, useVendorOrganizationWithRelations } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Pencil, Power, PowerOff, ShieldAlert } from "lucide-react";
import { useLayoutEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AccountSection } from "./components/AccountSection";
import { FileSection } from "./components/FileSection";
import { GstSection } from "./components/GstSection";
import { PersonSection } from "./components/PersonSection";
import { MsmeBadge } from "./helpers/MsmeBadge";
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
            <Card>
                <CardHeader>
                    <CardTitle>{organization.name}</CardTitle>
                    <CardAction>
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
                    </CardAction>
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
                                <TableCell className="align-top break-words">{organization.msme || "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-muted-foreground align-top">MSME Type</TableCell>
                                <TableCell className="align-top break-words">
                                    <MsmeBadge key="msmeType" msme={organization.msme} msmeType={organization.msmeType} />
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground align-top">Address</TableCell>
                                <TableCell className="align-top break-words">{organization.address || "-"}</TableCell>
                            </TableRow>
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
                    {/* Sections call useFormContext, so the tabbed content must sit inside a FormProvider. */}
                    <Form {...form}>
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
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default VendorViewPage;
