// src/pages/courier/CourierDispatchForm.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, FileText, Package, MapPin, User, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { paths } from "@/app/routes/paths";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { useCourier, useCreateCourierDispatch } from "@/modules/shared/courier/courier.hooks";
import { COURIER_STATUS } from "@/modules/shared/courier/courier.types";
import { format } from "date-fns";

// Validation schema
const courierDispatchSchema = z.object({
    courierProvider: z.string().min(1, "Courier provider is required"),
    pickupDate: z.string().min(1, "Pickup date and time is required"),
    docketNo: z.string().min(1, "Docket number is required"),
});

type CourierDispatchFormData = z.infer<typeof courierDispatchSchema>;

// Allowed file types
const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const CourierDispatchForm = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const courierId = id ? parseInt(id, 10) : 0;
    console.log("Courier ID:", courierId);

    // File state
    const [file, setFile] = useState<File | null>(null);

    // API hooks
    const { data: courier, isLoading: courierLoading, error: courierError } = useCourier(courierId);
    const dispatchMutation = useCreateCourierDispatch();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<CourierDispatchFormData>({
        resolver: zodResolver(courierDispatchSchema),
        defaultValues: {
            courierProvider: "",
            pickupDate: "",
            docketNo: "",
        },
    });

    // Redirect if courier is already dispatched or doesn't exist
    useEffect(() => {
        if (courier && courier.status !== COURIER_STATUS.PENDING) {
            toast.error("This courier has already been dispatched or processed");
            navigate(paths.shared.couriers);
        }
    }, [courier, navigate]);

    // Handle form submission
    const onSubmit = async (data: CourierDispatchFormData) => {
        if (!courierId) {
            toast.error("Invalid courier ID");
            return;
        }

        const toastId = toast.loading("Dispatching courier...");

        try {
            await dispatchMutation.mutateAsync({
                id: courierId,
                data: {
                    courierProvider: data.courierProvider,
                    docketNo: data.docketNo,
                    pickupDate: data.pickupDate,
                    docketSlip: file || undefined,
                },
            });

            toast.success("Courier dispatched successfully!", {
                id: toastId,
                description: `Docket #${data.docketNo} has been recorded.`,
            });

            navigate(paths.shared.couriers);
        } catch (error: any) {
            toast.error(error.message || "Failed to dispatch courier", {
                id: toastId,
                description: "Please check your connection and try again.",
            });
        }
    };

    // Handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
            toast.error("Invalid file type", {
                description: "Please select an image, PDF, or Word document.",
            });
            event.target.value = "";
            return;
        }

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast.error("File too large", {
                description: "File size must be less than 25MB.",
            });
            event.target.value = "";
            return;
        }

        setFile(selectedFile);
        toast.success("File selected", {
            description: `${selectedFile.name} ready for upload.`,
        });
    };

    // Remove selected file
    const removeFile = () => {
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("docket_slip") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        toast.info("File removed");
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Loading state
    if (courierLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-9 w-24" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    // Error state
    if (courierError || !courier) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">{courierError ? "Failed to load courier details" : "Courier not found"}</p>
                        <Button onClick={() => navigate(paths.shared.couriers)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Couriers
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(paths.shared.couriers)} className="flex items-center space-x-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Go Back</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Courier Dispatch Form</h1>
                        <p className="text-muted-foreground">Dispatch details for Courier #{courier.id}</p>
                    </div>
                </div>
            </div>

            {/* Courier Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Courier Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Recipient
                            </p>
                            <p className="font-medium">{courier.toName}</p>
                            <p className="text-sm text-muted-foreground">{courier.toOrg}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Destination
                            </p>
                            <p className="font-medium">{courier.toAddr}</p>
                            <p className="text-sm text-muted-foreground">PIN: {courier.toPin}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expected Delivery
                            </p>
                            <p className="font-medium">{format(new Date(courier.delDate), "PPP")}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Contact</p>
                            <p className="font-medium">{courier.toMobile}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dispatch Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Dispatch Details</CardTitle>
                    <CardDescription>Enter the courier dispatch information below</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Courier Provider */}
                            <div className="space-y-2">
                                <Label htmlFor="courier_provider">
                                    Courier Provider <span className="text-destructive">*</span>
                                </Label>
                                <Input id="courier_provider" placeholder="e.g., BlueDart, DTDC, FedEx" {...register("courierProvider")} disabled={isSubmitting} />
                                {errors.courierProvider && <p className="text-sm text-destructive">{errors.courierProvider.message}</p>}
                            </div>

                            {/* Pickup Date and Time */}
                            <div className="space-y-2">
                                <Label htmlFor="pickup_date">
                                    Pickup Date and Time <span className="text-destructive">*</span>
                                </Label>
                                <Input id="pickup_date" type="datetime-local" {...register("pickupDate")} disabled={isSubmitting} />
                                {errors.pickupDate && <p className="text-sm text-destructive">{errors.pickupDate.message}</p>}
                            </div>

                            {/* Docket Number */}
                            <div className="space-y-2">
                                <Label htmlFor="docket_no">
                                    Docket No <span className="text-destructive">*</span>
                                </Label>
                                <Input id="docket_no" placeholder="Enter docket/AWB number" {...register("docketNo")} disabled={isSubmitting} />
                                {errors.docketNo && <p className="text-sm text-destructive">{errors.docketNo.message}</p>}
                            </div>
                        </div>

                        {/* Docket Slip File Upload */}
                        <div className="space-y-4">
                            <Label htmlFor="docket_slip">
                                Docket Slip <span className="text-muted-foreground">(Optional)</span>
                            </Label>

                            {!file ? (
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                                    <Input
                                        id="docket_slip"
                                        type="file"
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        disabled={isSubmitting}
                                    />
                                    <Label htmlFor="docket_slip" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium text-primary">Click to upload</span> or drag and drop
                                        </div>
                                        <div className="text-xs text-muted-foreground">Images, PDF, or Word documents (Max 25MB)</div>
                                    </Label>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FileText className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={removeFile}
                                        disabled={isSubmitting}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(paths.shared.couriers)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-32">
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                        Dispatching...
                                    </>
                                ) : (
                                    "Dispatch Courier"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CourierDispatchForm;
