import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useCreateVendorAccount, useUpdateVendorAccount } from "@/hooks/api/useVendorAccounts";
import { accountApiToForm, toCreateAccountDto, toUpdateAccountDto } from "../helpers/vendorForm.mappers";
import { AccountFormSchema, type AccountFormValues } from "../helpers/vendorForm.schema";

const emptyAccount: AccountFormValues = {
    bankAccountName: "",
    accountNum: "",
    ifscCode: "",
    status: true,
};

export type AccountFormDialogProps = {
    orgId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: AccountFormValues | null;
    siblings: AccountFormValues[];
    onSaved: (values: AccountFormValues) => void;
};

export const AccountFormDialog = ({ orgId, open, onOpenChange, initial, siblings, onSaved }: AccountFormDialogProps) => {
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(AccountFormSchema),
        defaultValues: emptyAccount,
    });

    const createAccount = useCreateVendorAccount();
    const updateAccount = useUpdateVendorAccount();

    useEffect(() => {
        if (open) form.reset(initial ?? emptyAccount);
    }, [open, initial, form]);

    const handleSave = form.handleSubmit(values => {
        const accountNum = values.accountNum.trim().toLowerCase();

        if (siblings.some(account => account.id !== initial?.id && (account.accountNum ?? "").trim().toLowerCase() === accountNum)) {
            form.setError("accountNum", { message: "Account number already exists" });
            return;
        }

        if (initial?.id) {
            updateAccount.mutate({ id: initial.id, data: toUpdateAccountDto(values) }, {
                onSuccess: () => onSaved({ ...initial, ...values }),
            });
        } else if (orgId) {
            createAccount.mutate(toCreateAccountDto(values, orgId), {
                onSuccess: created => onSaved(accountApiToForm(created)),
            });
        } else {
            onSaved(values);
        }

        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Account" : "Add Account"}</DialogTitle>
                    <DialogDescription className="hidden">Add or edit account details</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <div className="space-y-4 pt-2">
                        <FieldWrapper control={form.control} name="bankAccountName" label="Account Name">
                            {field => <Input placeholder="e.g. Current Account" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="accountNum" label="Account Number">
                            {field => <Input placeholder="e.g. 1234567890123456" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="ifscCode" label="IFSC Code">
                            {field => <Input placeholder="e.g. HDFC0001234" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FormField
                            control={form.control}
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
                </Form>

                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button type="button" onClick={handleSave}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
