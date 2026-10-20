import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteVendorAccount } from "@/hooks/api/useVendorAccounts";
import { useDeleteVendorFile, useVendorFilesByOrg, vendorFilesKey } from "@/hooks/api/useVendorFiles";
import { useDeleteVendorGst } from "@/hooks/api/useVendorGsts";
import { useDeleteVendor } from "@/hooks/api/useVendors";
import { useSetVendorOrganizationStatus, useVendorOrganizationWithRelations, vendorOrganizationsKey } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { AlertCircle, ArrowLeft, Edit, Pencil, Plus, Power, PowerOff, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AccountFormDialog } from "./components/AccountFormDialog";
import { FileFormDialog } from "./components/FileFormDialog";
import { GstFormDialog } from "./components/GstFormDialog";
import { PersonFormDialog } from "./components/PersonFormDialog";
import { MsmeBadge } from "./helpers/MsmeBadge";
import {
    accountApiToForm,
    fileApiToForm,
    gstApiToForm,
    personApiToForm,
} from "./helpers/vendorForm.mappers";
import type { AccountFormValues, FileFormValues, GstFormValues, PersonFormValues } from "./helpers/vendorForm.schema";
import { vendorAreaBase } from "./vendorAreaPath";
import { VendorRelationTables, type VendorRelationTab } from "@/modules/shared/vendor-directory/VendorRelationTables";

const PERMISSION_MODULE = "master.vendors";

const VendorViewPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const { id } = useParams<{ id: string }>();
    const orgId = id ? parseInt(id) : null;

    const { canRead, canCreate, canUpdate, canDelete } = useAuth();
    const queryClient = useQueryClient();

    const { data: organization, isLoading, error } = useVendorOrganizationWithRelations(orgId);
    const { data: files } = useVendorFilesByOrg(orgId);
    const setVendorStatus = useSetVendorOrganizationStatus();

    const deleteGst = useDeleteVendorGst();
    const deleteAccount = useDeleteVendorAccount();
    const deletePerson = useDeleteVendor();
    const deleteFile = useDeleteVendorFile();

    const [gstDialog, setGstDialog] = useState<{ open: boolean; initial: GstFormValues | null }>({ open: false, initial: null });
    const [accountDialog, setAccountDialog] = useState<{ open: boolean; initial: AccountFormValues | null }>({ open: false, initial: null });
    const [personDialog, setPersonDialog] = useState<{ open: boolean; initial: PersonFormValues | null }>({ open: false, initial: null });
    const [fileDialog, setFileDialog] = useState<{ open: boolean; initial: FileFormValues | null }>({ open: false, initial: null });

    const { activeTab, setActiveTab } = usePersistentTableState<VendorRelationTab>({
        storageKey: "vendor-master-view",
        defaultTab: "gsts",
    });

    const invalidateOrg = () => {
        if (!orgId) return;
        queryClient.invalidateQueries({ queryKey: vendorOrganizationsKey.detail(orgId) });
    };

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

    const gsts = organization.gsts ?? [];
    const accounts = organization.accounts ?? [];
    const persons = organization.persons ?? [];
    const orgFiles = files ?? organization.files ?? [];

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
                        gstHeaderAction={
                            canCreate(PERMISSION_MODULE) ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setGstDialog({ open: true, initial: null })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add GST
                                </Button>
                            ) : undefined
                        }
                        gstRowActions={gst =>
                            canUpdate(PERMISSION_MODULE) || canDelete(PERMISSION_MODULE) ? (
                                <div className="flex justify-end gap-1">
                                    {canUpdate(PERMISSION_MODULE) && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setGstDialog({ open: true, initial: gstApiToForm(gst) })}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {canDelete(PERMISSION_MODULE) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteGst.mutate(gst.id, { onSuccess: invalidateOrg })}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ) : null
                        }
                        accountHeaderAction={
                            canCreate(PERMISSION_MODULE) ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setAccountDialog({ open: true, initial: null })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Account
                                </Button>
                            ) : undefined
                        }
                        accountRowActions={account =>
                            canUpdate(PERMISSION_MODULE) || canDelete(PERMISSION_MODULE) ? (
                                <div className="flex justify-end gap-1">
                                    {canUpdate(PERMISSION_MODULE) && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setAccountDialog({ open: true, initial: accountApiToForm(account) })}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {canDelete(PERMISSION_MODULE) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteAccount.mutate(account.id, { onSuccess: invalidateOrg })}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ) : null
                        }
                        personHeaderAction={
                            canCreate(PERMISSION_MODULE) ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setPersonDialog({ open: true, initial: null })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Person
                                </Button>
                            ) : undefined
                        }
                        personRowActions={person =>
                            canUpdate(PERMISSION_MODULE) || canDelete(PERMISSION_MODULE) ? (
                                <div className="flex justify-end gap-1">
                                    {canUpdate(PERMISSION_MODULE) && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setPersonDialog({ open: true, initial: personApiToForm(person) })}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {canDelete(PERMISSION_MODULE) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deletePerson.mutate(person.id, { onSuccess: invalidateOrg })}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ) : null
                        }
                        filesHeaderAction={
                            canCreate(PERMISSION_MODULE) ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setFileDialog({ open: true, initial: null })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add File
                                </Button>
                            ) : undefined
                        }
                        fileRowActions={file =>
                            canUpdate(PERMISSION_MODULE) || canDelete(PERMISSION_MODULE) ? (
                                <div className="flex justify-end gap-1">
                                    {canUpdate(PERMISSION_MODULE) && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setFileDialog({ open: true, initial: fileApiToForm(file) })}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {canDelete(PERMISSION_MODULE) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                deleteFile.mutate(file.id, {
                                                    onSuccess: () => {
                                                        invalidateOrg();
                                                        queryClient.invalidateQueries({ queryKey: vendorFilesKey.byOrg(orgId) });
                                                    },
                                                })
                                            }
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ) : null
                        }
                    />
                </CardContent>
            </Card>

            <GstFormDialog
                orgId={orgId}
                open={gstDialog.open}
                onOpenChange={open => setGstDialog(prev => ({ ...prev, open }))}
                initial={gstDialog.initial}
                siblings={gsts.map(gstApiToForm)}
                onSaved={invalidateOrg}
            />
            <AccountFormDialog
                orgId={orgId}
                open={accountDialog.open}
                onOpenChange={open => setAccountDialog(prev => ({ ...prev, open }))}
                initial={accountDialog.initial}
                siblings={accounts.map(accountApiToForm)}
                onSaved={invalidateOrg}
            />
            <PersonFormDialog
                orgId={orgId}
                open={personDialog.open}
                onOpenChange={open => setPersonDialog(prev => ({ ...prev, open }))}
                initial={personDialog.initial}
                siblings={persons.map(personApiToForm)}
                onSaved={invalidateOrg}
            />
            <FileFormDialog
                orgId={orgId}
                open={fileDialog.open}
                onOpenChange={open => setFileDialog(prev => ({ ...prev, open }))}
                initial={fileDialog.initial}
                onSaved={() => {
                    invalidateOrg();
                    queryClient.invalidateQueries({ queryKey: vendorFilesKey.byOrg(orgId) });
                }}
            />
        </div>
    );
};

export default VendorViewPage;
