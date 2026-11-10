import { useEffect } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

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
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";

import { useUpdateCourierStatus } from "@/hooks/api/useCourier";
import {
    COURIER_STATUS,
    COURIER_STATUS_OPTIONS,
} from "@/modules/shared/courier/helpers/courier.constants";
import {
    CourierStatusSchema,
    type CourierStatusFormValues,
} from "@/modules/shared/courier/helpers/courier.schema";
import type { Courier } from "@/modules/shared/courier/helpers/courier.types";

interface CourierStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courier: Courier | null;
}

export function CourierStatusDialog({ open, onOpenChange, courier }: CourierStatusDialogProps) {
    const updateStatusMutation = useUpdateCourierStatus();

    const form = useForm<CourierStatusFormValues>({
        resolver: zodResolver(CourierStatusSchema) as Resolver<CourierStatusFormValues>,
        defaultValues: {
            status: COURIER_STATUS.PENDING,
            deliveryDate: "",
            withinTime: undefined,
            pod: [],
        },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({
            status: courier?.status ?? COURIER_STATUS.PENDING,
            deliveryDate: "",
            withinTime: undefined,
            pod: [],
        });
    }, [open, courier, form]);

    const status = form.watch("status");
    const pod = form.watch("pod") ?? [];
    const isDelivered = Number(status) === COURIER_STATUS.DELIVERED;
    const isSubmitting = updateStatusMutation.isPending;

    const handleSubmit: SubmitHandler<CourierStatusFormValues> = async values => {
        if (!courier) return;

        try {
            await updateStatusMutation.mutateAsync({
                id: courier.id,
                data: {
                    status: Number(values.status),
                    deliveryDate: isDelivered ? values.deliveryDate : undefined,
                    withinTime: isDelivered ? values.withinTime === "1" : undefined,
                    podDoc: isDelivered ? values.pod?.[0] : undefined,
                },
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update courier status:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Status</DialogTitle>
                    <DialogDescription>
                        Update the status of courier #{courier?.id ?? "-"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
                        <SelectField
                            control={form.control}
                            name="status"
                            label="Status"
                            options={COURIER_STATUS_OPTIONS}
                            placeholder="Select Status"
                            disabled={isSubmitting}
                            valueType="number"
                        />

                        {isDelivered && (
                            <div className="grid gap-4 border-t pt-4">
                                <FieldWrapper control={form.control} name="deliveryDate" label="Delivery Date & Time">
                                    {field => <Input {...field} type="datetime-local" disabled={isSubmitting} />}
                                </FieldWrapper>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Delivery POD Upload</p>
                                    <FileUploader
                                        context="courier"
                                        value={pod}
                                        onChange={value => form.setValue("pod", value, { shouldValidate: true })}
                                        disabled={isSubmitting}
                                        maxFiles={1}
                                    />
                                </div>

                                <SelectField
                                    control={form.control}
                                    name="withinTime"
                                    label="Delivered within Expected Time?"
                                    options={[
                                        { value: "1", label: "Yes" },
                                        { value: "0", label: "No" },
                                    ]}
                                    placeholder="Select"
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default CourierStatusDialog;
