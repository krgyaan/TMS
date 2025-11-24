import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { paths } from "@/app/routes/paths";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";

// Validation schema
const courierDispatchSchema = z.object({
    courier_provider: z.string().min(1, "Courier provider is required"),
    pickup_date: z.string().min(1, "Pickup date and time is required"),
    docket_no: z.string().min(1, "Docket number is required"),
    docket_slip: z.instanceof(FileList).optional(),
});

type CourierDispatchFormData = z.infer<typeof courierDispatchSchema>;

const CourierDispatchForm = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<CourierDispatchFormData>({
        resolver: zodResolver(courierDispatchSchema),
        defaultValues: {
            courier_provider: "",
            pickup_date: "",
            docket_no: "",
        },
    });

    // Mock data - replace with actual API call
    const courierData = {
        id: id || "1",
        reference_no: "COU-2024-001",
        recipient_name: "John Doe",
        destination: "Mohan Estate",
    };

    const onSubmit = async (data: CourierDispatchFormData) => {
        setIsSubmitting(true);

        // Show loading toast
        const toastId = toast.loading("Submitting courier dispatch form...");

        try {
            const formData = new FormData();
            formData.append("id", id || "");
            formData.append("courier_provider", data.courier_provider);
            formData.append("pickup_date", data.pickup_date);
            formData.append("docket_no", data.docket_no);

            if (file) {
                formData.append("docket_slip", file);
            }

            // Simulate API call - replace with actual API
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Replace with actual API call
            // const response = await fetch('/api/courier/dispatch', {
            //   method: 'POST',
            //   body: formData,
            // });

            // if (!response.ok) {
            //   throw new Error('Submission failed');
            // }

            toast.success("Courier dispatch form submitted successfully!", {
                id: toastId,
                description: `Docket #${data.docket_no} has been recorded.`,
                action: {
                    label: "View All",
                    onClick: () => navigate("/courier"),
                },
            });

            navigate("/courier");
        } catch (error) {
            toast.error("Failed to submit courier dispatch form", {
                id: toastId,
                description: "Please check your connection and try again.",
                action: {
                    label: "Retry",
                    onClick: () => handleSubmit(onSubmit)(),
                },
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "text/plain",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ];

            if (!allowedTypes.includes(selectedFile.type)) {
                toast.error("Invalid file type", {
                    description: "Please select a valid file type (images, PDF, Word, PowerPoint, or text files).",
                });
                event.target.value = ""; // Reset input
                return;
            }

            // Validate file size (25MB)
            if (selectedFile.size > 25 * 1024 * 1024) {
                toast.error("File too large", {
                    description: "File size must be less than 25MB.",
                });
                event.target.value = ""; // Reset input
                return;
            }

            setFile(selectedFile);
            toast.success("File selected", {
                description: `${selectedFile.name} has been selected for upload.`,
            });
        }
    };

    const removeFile = () => {
        setFile(null);
        setValue("docket_slip", undefined as any);
        toast.info("File removed", {
            description: "Docket slip file has been removed.",
        });
    };

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
                        <p className="text-muted-foreground">Dispatch details for {courierData.reference_no}</p>
                    </div>
                </div>
            </div>

            {/* Courier Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Courier Information</CardTitle>
                    <CardDescription>
                        Reference: {courierData.reference_no} | Recipient: {courierData.recipient_name} | Destination: {courierData.destination}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Dispatch Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Dispatch Details</CardTitle>
                    <CardDescription>Enter the courier dispatch information below</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <input type="hidden" name="id" value={id} />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Courier Provider */}
                            <div className="space-y-2">
                                <Label htmlFor="courier_provider">Courier Provider</Label>
                                <Input id="courier_provider" placeholder="Enter courier provider name" {...register("courier_provider")} />
                                {errors.courier_provider && <p className="text-sm text-destructive">{errors.courier_provider.message}</p>}
                            </div>

                            {/* Pickup Date and Time */}
                            <div className="space-y-2">
                                <Label htmlFor="pickup_date">Pickup Date and Time</Label>
                                <Input id="pickup_date" type="datetime-local" {...register("pickup_date")} />
                                {errors.pickup_date && <p className="text-sm text-destructive">{errors.pickup_date.message}</p>}
                            </div>

                            {/* Docket Number */}
                            <div className="space-y-2">
                                <Label htmlFor="docket_no">Docket No</Label>
                                <Input id="docket_no" placeholder="Enter docket number" {...register("docket_no")} />
                                {errors.docket_no && <p className="text-sm text-destructive">{errors.docket_no.message}</p>}
                            </div>
                        </div>

                        {/* Docket Slip File Upload */}
                        <div className="space-y-4">
                            <Label htmlFor="docket_slip">Docket Slip</Label>

                            {!file ? (
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                                    <Input
                                        id="docket_slip"
                                        type="file"
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.gif,.txt,.pdf,.doc,.docx,.ppt,.pptx"
                                        onChange={handleFileChange}
                                    />
                                    <Label htmlFor="docket_slip" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Click to upload</span> or drag and drop
                                        </div>
                                        <div className="text-xs text-muted-foreground">Supports: Images, PDF, Word, PowerPoint, Text files (Max 25MB)</div>
                                    </Label>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-8 w-8 text-blue-500" />
                                        <div>
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={removeFile}>
                                        Remove
                                    </Button>
                                </div>
                            )}

                            {errors.docket_slip && <p className="text-sm text-destructive">{errors.docket_slip.message}</p>}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting} className="flex items-center space-x-2 min-w-24">
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit</span>
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
