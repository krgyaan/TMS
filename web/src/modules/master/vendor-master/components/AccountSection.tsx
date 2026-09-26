import { useState } from "react";
import { useFormContext, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useCreateVendorAccount, useUpdateVendorAccount, useDeleteVendorAccount } from "@/hooks/api/useVendorAccounts";
import { DialogDescription } from "@radix-ui/react-dialog";
import { accountApiToForm, toCreateAccountDto, toUpdateAccountDto } from "../helpers/vendorForm.mappers";
import { AccountFormSchema, type AccountFormValues, type VendorFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";

const emptyAccount: AccountFormValues = {
    bankAccountName: "",
    accountNum: "",
    ifscCode: "",
    status: true,
};

export const AccountSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();

    const { fields, append, remove, update } = useFieldArray({ control, name: "accounts" });

    const createAccount = useCreateVendorAccount();
    const updateAccount = useUpdateVendorAccount();
    const deleteAccount = useDeleteVendorAccount();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const dialogForm = useForm<AccountFormValues>({
        resolver: zodResolver(AccountFormSchema),
        defaultValues: emptyAccount,
    });

    const openAdd = () => {
        setEditingIndex(null);
        dialogForm.reset(emptyAccount);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const account = getValues(`accounts.${index}`);
        setEditingIndex(index);
        dialogForm.reset(account);
        setOpen(true);
    };

    const handleSave = dialogForm.handleSubmit(values => {
        if (editingIndex !== null) {
            const existing = getValues(`accounts.${editingIndex}`);

            if (orgId && existing?.id) {
                updateAccount.mutate({
                    id: existing.id,
                    data: toUpdateAccountDto(values),
                });
            }
            update(editingIndex, { ...existing, ...values });
        } else {
            if (orgId) {
                createAccount.mutate(toCreateAccountDto(values, orgId), {
                    onSuccess: created => {
                        append(accountApiToForm(created));
                    },
                });
            } else {
                append(values);
            }
        }

        setOpen(false);
    });

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
                        <FieldWrapper control={dialogForm.control} name="bankAccountName" label="Account Name">
                            {field => <Input placeholder="e.g. Current Account" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="accountNum" label="Account Number">
                            {field => <Input placeholder="e.g. 1234567890123456" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="ifscCode" label="IFSC Code">
                            {field => <Input placeholder="e.g. HDFC0001234" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FormField
                            control={dialogForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Active</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
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
