import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useDeleteVendorAccount } from "@/hooks/api/useVendorAccounts";
import { useAuth } from "@/contexts/AuthContext";
import type { VendorFormValues, AccountFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";
import { AccountFormDialog } from "./AccountFormDialog";

const PERMISSION_MODULE = "master.vendors";

export const AccountSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();
    const { canCreate, canUpdate, canDelete } = useAuth();

    const { fields, append, remove, update } = useFieldArray({ control, name: "accounts" });

    const deleteAccount = useDeleteVendorAccount();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [initial, setInitial] = useState<AccountFormValues | null>(null);

    const openAdd = () => {
        setEditingIndex(null);
        setInitial(null);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        setEditingIndex(index);
        setInitial(getValues(`accounts.${index}`));
        setOpen(true);
    };

    const handleSaved = (values: AccountFormValues) => {
        if (editingIndex !== null) {
            const existing = getValues(`accounts.${editingIndex}`);
            update(editingIndex, { ...existing, ...values });
        } else {
            append(values);
        }
    };

    const handleDelete = (index: number) => {
        const account = getValues(`accounts.${index}`);

        if (account?.id) {
            deleteAccount.mutate(account.id);
        }

        remove(index);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Bank Accounts</CardTitle>

                    {canCreate(PERMISSION_MODULE) && (
                        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Account
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {fields.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">No bank accounts added.</div>}

                {fields.map((account, index) => (
                    <Card key={account.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{account.bankAccountName}</div>

                                <div className="text-sm text-muted-foreground">{account.accountNum}</div>

                                <div className="text-sm text-muted-foreground">IFSC: {account.ifscCode}</div>
                            </div>

                            <div className="flex gap-2">
                                {canUpdate(PERMISSION_MODULE) && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(index)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}

                                {canDelete(PERMISSION_MODULE) && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>

            <AccountFormDialog
                orgId={orgId}
                open={open}
                onOpenChange={setOpen}
                initial={initial}
                siblings={getValues("accounts")}
                onSaved={handleSaved}
            />
        </Card>
    );
};
