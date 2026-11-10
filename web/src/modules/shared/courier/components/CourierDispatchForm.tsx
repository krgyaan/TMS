import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Calendar, Loader2, MapPin, Package, Send, User } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { FileUploader } from "@/components/file-upload";

import { useCourier, useCreateCourierDispatch } from "@/hooks/api/useCourier";
import { COURIER_STATUS } from "@/modules/shared/courier/helpers/courier.constants";
import {
    CourierDispatchSchema,
    type CourierDispatchFormValues,
} from "@/modules/shared/courier/helpers/courier.schema";

interface CourierDispatchFormProps {
    courierId: number;
}

export function CourierDispatchForm({ courierId }: CourierDispatchFormProps) {
    const navigate = useNavigate();
    const { data: courier, isLoading, error } = useCourier(courierId);
    const dispatchMutation = useCreateCourierDispatch();

    const [files, setFiles] = useState<string[]>([]);
    const hasSubmittedRef = useRef(false);

    const form = useForm<CourierDispatchFormValues>({
        resolver: zodResolver(CourierDispatchSchema) as Resolver<CourierDispatchFormValues>,
        defaultValues: {
            courierProvider: "",
            pickupDate: "",
            docketNo: "",
        },
    });

    useEffect(() => {
        if (courier && courier.status !== COURIER_STATUS.PENDING) {
            toast.error("This courier has already been dispatched or processed");
            navigate(paths.shared.couriers);
        }
    }, [courier, navigate]);

    const isSubmitting = dispatchMutation.isPending;

    const handleSubmit: SubmitHandler<CourierDispatchFormValues> = async values => {
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;

        try {
            await dispatchMutation.mutateAsync({
                id: courierId,
                data: {
                    courierProvider: values.courierProvider,
                    docketNo: values.docketNo,
                    pickupDate: values.pickupDate,
                    docketSlip: files[0],
                },
            });
            navigate(paths.shared.couriers);
        } catch (err) {
            hasSubmittedRef.current = false;
            console.error("Failed to dispatch courier:", err);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="mt-4 h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !courier) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {error ? "Failed to load courier details" : "Courier not found"}
                </AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Back to Couriers
                </Button>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Courier Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="h-3 w-3" /> Recipient
                            </p>
                            <p className="font-medium">{courier.toName}</p>
                            <p className="text-sm text-muted-foreground">{courier.toOrg}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" /> Destination
                            </p>
                            <p className="font-medium">{courier.toAddr}</p>
                            <p className="text-sm text-muted-foreground">PIN: {courier.toPin}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" /> Expected Delivery
                            </p>
                            <p className="font-medium">{courier.delDate ? format(new Date(courier.delDate), "PPP") : "—"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Contact</p>
                            <p className="font-medium">{courier.toMobile}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Dispatch Details</CardTitle>
                        <CardDescription className="mt-2">
                            Enter the courier dispatch information for Courier #{courier.id}
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FieldWrapper control={form.control} name="courierProvider" label="Courier Provider">
                                    {field => (
                                        <Input
                                            {...field}
                                            placeholder="e.g., BlueDart, DTDC, FedEx"
                                            disabled={isSubmitting}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="pickupDate" label="Pickup Date and Time">
                                    {field => (
                                        <Input {...field} type="datetime-local" disabled={isSubmitting} />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="docketNo" label="Docket No">
                                    {field => (
                                        <Input
                                            {...field}
                                            placeholder="Enter docket/AWB number"
                                            disabled={isSubmitting}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    Docket Slip <span className="text-muted-foreground">(Optional)</span>
                                </p>
                                <FileUploader
                                    context="courier"
                                    value={files}
                                    onChange={setFiles}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(paths.shared.couriers)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Dispatching...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Dispatch Courier
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default CourierDispatchForm;
