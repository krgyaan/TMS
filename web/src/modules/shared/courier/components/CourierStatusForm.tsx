import { useEffect, useMemo } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    CheckCircle2,
    Clock,
    FileText,
    Info,
    Loader2,
    MapPin,
    Package,
    Truck,
    XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ConditionalSection } from "@/components/form/ConditionalSection";
import { FileUploader } from "@/components/file-upload";

import {
    useCreateCourierDispatch,
    useUpdateCourierDispatch,
    useUpdateCourierStatus,
} from "@/hooks/api/useCourier";
import {
    COURIER_STATUS,
    COURIER_STATUS_BADGE,
    COURIER_STATUS_LABELS,
    getAllowedCourierStatuses,
} from "@/modules/shared/courier/helpers/courier.constants";
import {
    CourierStatusSchema,
    type CourierStatusFormValues,
} from "@/modules/shared/courier/helpers/courier.schema";
import type { Courier } from "@/modules/shared/courier/helpers/courier.types";

const STATUS_ICONS: Record<number, React.ElementType> = {
    [COURIER_STATUS.PENDING]: Clock,
    [COURIER_STATUS.IN_TRANSIT]: Truck,
    [COURIER_STATUS.DISPATCHED]: Truck,
    [COURIER_STATUS.NOT_DELIVERED]: XCircle,
    [COURIER_STATUS.DELIVERED]: CheckCircle2,
    [COURIER_STATUS.REJECTED]: XCircle,
};

interface CourierStatusFormProps {
    courier: Courier;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function CourierStatusForm({ courier, onSuccess, onCancel }: CourierStatusFormProps) {
    const createDispatchMutation = useCreateCourierDispatch();
    const updateDispatchMutation = useUpdateCourierDispatch();
    const statusMutation = useUpdateCourierStatus();

    const allStatuses = useMemo(() => Object.values(COURIER_STATUS), []);

    const allowedStatuses = useMemo(
        () => getAllowedCourierStatuses(courier.status),
        [courier.status]
    );

    const defaultStatus = courier.status;

    const form = useForm<CourierStatusFormValues>({
        resolver: zodResolver(CourierStatusSchema) as Resolver<CourierStatusFormValues>,
        defaultValues: {
            status: defaultStatus,
            deliveryDate: "",
            withinTime: undefined,
            pod: [],
            courierProvider: "",
            pickupDate: "",
            docketNo: "",
            docketSlip: [],
        },
    });

    useEffect(() => {
        form.reset({
            status: defaultStatus,
            deliveryDate: "",
            withinTime: undefined,
            pod: [],
            courierProvider: "",
            pickupDate: "",
            docketNo: "",
            docketSlip: [],
        });
    }, [courier.id, defaultStatus, form]);

    const status = Number(form.watch("status"));
    const pod = form.watch("pod") ?? [];
    const docketSlip = form.watch("docketSlip") ?? [];
    const isCurrentStatus = status === courier.status;
    const isDispatch = status === COURIER_STATUS.DISPATCHED && !isCurrentStatus;
    const isDelivered = status === COURIER_STATUS.DELIVERED && !isCurrentStatus;
    const canSubmit = !isCurrentStatus && allowedStatuses.includes(status);

    const isSubmitting =
        createDispatchMutation.isPending ||
        updateDispatchMutation.isPending ||
        statusMutation.isPending;

    const handleSubmit: SubmitHandler<CourierStatusFormValues> = async values => {
        const targetStatus = Number(values.status);

        if (targetStatus === courier.status || !allowedStatuses.includes(targetStatus)) {
            return;
        }

        if (targetStatus === COURIER_STATUS.DISPATCHED) {
            const payload = {
                courierProvider: (values.courierProvider ?? "").trim(),
                docketNo: (values.docketNo ?? "").trim(),
                pickupDate: values.pickupDate ?? "",
                docketSlip: values.docketSlip?.[0],
            };

            if (courier.status === COURIER_STATUS.PENDING) {
                await createDispatchMutation.mutateAsync({ id: courier.id, data: payload });
            } else {
                await updateDispatchMutation.mutateAsync({ id: courier.id, data: payload });
            }
        } else {
            await statusMutation.mutateAsync({
                id: courier.id,
                data: {
                    status: targetStatus,
                    deliveryDate: targetStatus === COURIER_STATUS.DELIVERED ? values.deliveryDate : undefined,
                    withinTime: targetStatus === COURIER_STATUS.DELIVERED ? values.withinTime === "1" : undefined,
                    podDoc: targetStatus === COURIER_STATUS.DELIVERED ? values.pod?.[0] : undefined,
                },
            });
        }

        onSuccess?.();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium leading-none">Choose Status</label>
                        <span className="text-xs text-muted-foreground">
                            Current:{" "}
                            <Badge variant={COURIER_STATUS_BADGE[courier.status] ?? "outline"}>
                                {COURIER_STATUS_LABELS[courier.status] ?? `Status ${courier.status}`}
                            </Badge>
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {allStatuses.map(optionStatus => {
                            const Icon = STATUS_ICONS[optionStatus] ?? Package;
                            const selected = status === optionStatus;
                            const isCurrent = optionStatus === courier.status;
                            const isAllowed = allowedStatuses.includes(optionStatus);
                            const selectable = isAllowed && !isCurrent;

                            return (
                                <div
                                    key={optionStatus}
                                    aria-disabled={!selectable}
                                    className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                                        selectable ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
                                    } ${selected ? "border-primary bg-primary/5" : ""}`}
                                    onClick={() => {
                                        if (selectable) {
                                            form.setValue("status", optionStatus, { shouldValidate: true });
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Badge variant={selected ? "success" : "secondary"} className="rounded-full p-2">
                                            <Icon className="h-3 w-3" />
                                        </Badge>
                                        <div className="font-medium text-sm">
                                            {COURIER_STATUS_LABELS[optionStatus] ?? `Status ${optionStatus}`}
                                        </div>
                                        {isCurrent && (
                                            <Badge variant="outline" className="text-[10px]">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {allowedStatuses.length === 0 && (
                        <div className="rounded-lg border border-muted-foreground/20 bg-muted/40 p-3 flex items-start gap-2">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-sm text-muted-foreground">
                                No status changes are available from the current status.
                            </p>
                        </div>
                    )}
                    {form.formState.errors.status && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>
                    )}
                </div>

                <ConditionalSection show={isDispatch}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Truck className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Dispatch Details</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record courier pickup and docket information
                        </p>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FieldWrapper control={form.control} name="courierProvider" label="Courier Provider">
                                {field => (
                                    <Input {...field} placeholder="e.g., BlueDart, DTDC, FedEx" disabled={isSubmitting} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="pickupDate" label="Pickup Date & Time">
                                {field => <Input {...field} type="datetime-local" disabled={isSubmitting} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="docketNo" label="Docket No">
                                {field => (
                                    <Input {...field} placeholder="Enter docket/AWB number" disabled={isSubmitting} />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">
                                Docket Slip <span className="text-muted-foreground">(Optional)</span>
                            </p>
                            <FileUploader
                                context="courier"
                                value={docketSlip}
                                onChange={value => form.setValue("docketSlip", value, { shouldValidate: true })}
                                disabled={isSubmitting}
                                maxFiles={1}
                            />
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={isDelivered}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Delivery Confirmation</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Capture delivery proof and timing
                        </p>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="deliveryDate" label="Delivery Date & Time">
                                {field => <Input {...field} type="datetime-local" disabled={isSubmitting} />}
                            </FieldWrapper>

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

                        <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Delivery POD Upload
                            </p>
                            <FileUploader
                                context="courier"
                                value={pod}
                                onChange={value => form.setValue("pod", value, { shouldValidate: true })}
                                disabled={isSubmitting}
                                maxFiles={1}
                            />
                        </div>
                    </div>
                </ConditionalSection>

                <div className="flex justify-end gap-3 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !canSubmit}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default CourierStatusForm;
