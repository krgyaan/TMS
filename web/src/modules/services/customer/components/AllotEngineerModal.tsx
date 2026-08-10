import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { Loader2, UserPlus } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useAllotEngineer, useCustomer, useUpdateEngineer } from "@/hooks/api/useCustomer";
import type { CustomerServiceEngineer } from "../helpers/customer.types";

const AllotEngineerFormSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().min(1, { message: "Email is required" }).email({ message: "Enter a valid email" }),
    phone: z.string().min(1, { message: "Mobile No. is required" }),
});

type AllotEngineerFormValues = z.infer<typeof AllotEngineerFormSchema>;

const defaultValues: AllotEngineerFormValues = {
    name: "",
    email: "",
    phone: "",
};

interface AllotEngineerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    complaintId: number | null;
    ticketNo?: string | null;
}

export function AllotEngineerModal({
    open,
    onOpenChange,
    complaintId,
    ticketNo,
}: AllotEngineerModalProps) {
    const allotEngineer = useAllotEngineer();
    const updateEngineer = useUpdateEngineer();

    const { data: complaint } = useCustomer(open && complaintId ? complaintId : 0);

    const engineer: CustomerServiceEngineer | null | undefined = complaint?.engineers?.[0];
    const isEditing = !!engineer?.id;

    const form = useForm<AllotEngineerFormValues>({
        resolver: zodResolver(AllotEngineerFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(defaultValues);
            return;
        }

        form.reset({
            name: engineer?.name ?? "",
            email: engineer?.email ?? "",
            phone: engineer?.phone ?? "",
        });
    }, [open, engineer, form]);

    const handleSubmit: SubmitHandler<AllotEngineerFormValues> = async values => {
        if (!complaintId) return;

        try {
            if (isEditing && engineer?.id) {
                await updateEngineer.mutateAsync({
                    id: complaintId,
                    engineerId: engineer.id,
                    data: values,
                });
            } else {
                await allotEngineer.mutateAsync({ id: complaintId, data: values });
            }
            handleClose();
        } catch {
            // error handled by hook via toast
        }
    };

    const handleClose = () => {
        form.reset();
        onOpenChange(false);
    };

    const saving = allotEngineer.isPending || updateEngineer.isPending;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        {isEditing ? "Update Engineer" : "Allot Engineer"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update engineer details for ticket"
                            : "Allot an engineer for ticket"}{" "}
                        <strong>{ticketNo || (complaintId ? `#${complaintId}` : "—")}</strong>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
                        <FieldWrapper<AllotEngineerFormValues, "name">
                            control={form.control}
                            name="name"
                            label="Name"
                        >
                            {field => (
                                <Input
                                    placeholder="Engineer name"
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>

                        <FieldWrapper<AllotEngineerFormValues, "email">
                            control={form.control}
                            name="email"
                            label="Email"
                        >
                            {field => (
                                <Input
                                    type="email"
                                    placeholder="engineer@company.com"
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>

                        <FieldWrapper<AllotEngineerFormValues, "phone">
                            control={form.control}
                            name="phone"
                            label="Mobile No."
                        >
                            {field => (
                                <Input
                                    type="tel"
                                    placeholder="Mobile number"
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>
                    </form>
                </Form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditing ? "Updating..." : "Allotting..."}
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                {isEditing ? "Update Engineer" : "Allot Engineer"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
