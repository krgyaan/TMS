import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Plus, Edit, Trash2 } from "lucide-react";

import { useCreateVendorAccount, useUpdateVendorAccount, useDeleteVendorAccount } from "@/hooks/api/useVendorAccounts";
import { DialogDescription } from "@radix-ui/react-dialog";

type AccountForm = {
    id?: number;
    bankAccountName: string;
    accountNum: string;
    ifscCode: string;
    status: boolean;
};

type Props = {
    orgId?: number;
};

export const AccountSection = ({ orgId }: Props) => {
    const { control, getValues } = useFormContext();

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "accounts",
    });

    const createAccount = useCreateVendorAccount();
    const updateAccount = useUpdateVendorAccount();
    const deleteAccount = useDeleteVendorAccount();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const emptyAccount: AccountForm = {
        bankAccountName: "",
        accountNum: "",
        ifscCode: "",
        status: true,
    };

    const [formState, setFormState] = useState<AccountForm>(emptyAccount);

    const openAdd = () => {
        setEditingIndex(null);
        setFormState(emptyAccount);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const account = getValues(`accounts.${index}`);
        setEditingIndex(index);
        setFormState(account);
        setOpen(true);
    };

    const handleSave = () => {
        if (editingIndex !== null) {
            const existing = getValues(`accounts.${editingIndex}`);

            if (orgId && existing?.id) {
                updateAccount.mutate({
                    id: existing.id,
                    data: {
                        orgId,
                        bankAccountName: formState.bankAccountName,
                        accountNum: formState.accountNum,
                        ifscCode: formState.ifscCode,
                        status: formState.status,
                    },
                });
            }
            update(editingIndex, { ...existing, ...formState });
        } else {
            if (orgId) {
                createAccount.mutate(
                    {
                        orgId,
                        bankAccountName: formState.bankAccountName,
                        accountNum: formState.accountNum,
                        ifscCode: formState.ifscCode,
                        status: formState.status,
                    },
                    {
                        onSuccess: created => {
                            append(created);
                        },
                    }
                );
            } else {
                append(formState);
            }
        }

        setOpen(false);
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

                    <Button variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                    </Button>
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
                                <Button variant="ghost" size="icon" onClick={() => openEdit(index)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                                <Button variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>

            {/* Dialog */}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit Account" : "Add Account"}</DialogTitle>
                        <DialogDescription className="hidden">Add or edit account details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Account Name</label>
                            <Input value={formState.bankAccountName} onChange={e => setFormState({ ...formState, bankAccountName: e.target.value })} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Account Number</label>
                            <Input value={formState.accountNum} onChange={e => setFormState({ ...formState, accountNum: e.target.value })} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">IFSC Code</label>
                            <Input value={formState.ifscCode} onChange={e => setFormState({ ...formState, ifscCode: e.target.value })} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={formState.status}
                                onCheckedChange={checked =>
                                    setFormState({
                                        ...formState,
                                        status: checked as boolean,
                                    })
                                }
                            />
                            <span className="text-sm">Active</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>

                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
