// pages/courier/CourierForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { paths } from "@/app/routes/paths";

// API & Hooks
import { useCreateCourier } from "@/modules/shared/courier/courier.hooks";
import { useUsers } from "@/hooks/api/useUsers";

// =====================
// Validation Schema
// =====================
const courierFormSchema = z.object({
    toOrg: z.string().min(1, "Organization name is required"),
    toName: z.string().min(1, "Recipient name is required"),
    toAddr: z.string().min(1, "Address is required"),
    toPin: z
        .string()
        .min(1, "Pin code is required")
        .regex(/^\d{6}$/, "Pin code must be 6 digits"),
    toMobile: z
        .string()
        .min(1, "Mobile number is required")
        .regex(/^\d{10}$/, "Mobile number must be 10 digits"),
    empFrom: z.number({ required_error: "Please select an employee" }).int().positive(),
    delDate: z.string().min(1, "Expected delivery date is required"),
    urgency: z.number({ required_error: "Please select dispatch urgency" }).int().min(1).max(2),
});

type CourierFormData = z.infer<typeof courierFormSchema>;

// =====================
// File validation
// =====================
const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB

// =====================
// Component
// =====================
const CourierForm = () => {
    const navigate = useNavigate();

    // Files state
    const [files, setFiles] = useState<File[]>([]);

    // API hooks
    const createMutation = useCreateCourier();
    const { data: employees = [], isLoading: employeesLoading } = useUsers();

    // Form setup
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<CourierFormData>({
        resolver: zodResolver(courierFormSchema),
        defaultValues: {
            toOrg: "",
            toName: "",
            toAddr: "",
            toPin: "",
            toMobile: "",
            empFrom: undefined,
            delDate: "",
            urgency: undefined,
        },
    });

    // Check if form is submitting
    const isSubmitting = createMutation.isPending;

    // Form submit handler
    const onSubmit = async (data: CourierFormData) => {
        try {
            // Step 1: Create courier
            const created = await createMutation.mutateAsync({ data, files });
            console.log("Courier created:", created);

            // Step 3: Navigate back
            navigate(paths.shared.couriers ?? "/courier");
        } catch (error) {
            // Error handled by mutation
            console.error("Create failed:", error);
        }
    };

    // File handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);

        if (selectedFiles.length === 0) return;

        // Validate file types
        const invalidFiles = selectedFiles.filter(file => !ALLOWED_FILE_TYPES.includes(file.type));

        if (invalidFiles.length > 0) {
            toast.error("Invalid file type", {
                description: "Please select valid files (images, PDF, Word, PowerPoint, or text files).",
            });
            return;
        }

        // Validate total size
        const currentSize = files.reduce((total, file) => total + file.size, 0);
        const newSize = selectedFiles.reduce((total, file) => total + file.size, 0);

        if (currentSize + newSize > MAX_TOTAL_SIZE) {
            toast.error("Files too large", {
                description: "Total file size must be less than 25MB.",
            });
            return;
        }

        setFiles(prev => [...prev, ...selectedFiles]);
        toast.success(`${selectedFiles.length} file(s) added`);

        // Reset input
        event.target.value = "";
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        toast.info("File removed");
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith("image/")) return "🖼️";
        if (file.type === "application/pdf") return "📄";
        if (file.type.includes("word") || file.type.includes("document")) return "📝";
        if (file.type.includes("presentation")) return "📊";
        return "📎";
    };

    const formatFileSize = (bytes: number) => {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(paths.shared.couriers ?? "/courier")} className="flex items-center space-x-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Courier Form</h1>
                        <p className="text-muted-foreground">Create a new courier dispatch request</p>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>New Courier Request</CardTitle>
                    <CardDescription>Fill in the details below to create a new courier dispatch request</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Courier To Section */}
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">Courier to:</Label>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Organization Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_org">
                                        Organization Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="to_org" placeholder="Enter organization name" {...register("toOrg")} disabled={isSubmitting} />
                                    {errors.toOrg && <p className="text-sm text-destructive">{errors.toOrg.message}</p>}
                                </div>

                                {/* Recipient Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_name">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="to_name" placeholder="Enter recipient name" {...register("toName")} disabled={isSubmitting} />
                                    {errors.toName && <p className="text-sm text-destructive">{errors.toName.message}</p>}
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_addr">
                                        Address <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="to_addr" placeholder="Enter complete address" {...register("toAddr")} disabled={isSubmitting} />
                                    {errors.toAddr && <p className="text-sm text-destructive">{errors.toAddr.message}</p>}
                                </div>

                                {/* Pin Code */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_pin">
                                        Pin Code <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="to_pin" placeholder="Enter 6-digit pin code" maxLength={6} {...register("toPin")} disabled={isSubmitting} />
                                    {errors.toPin && <p className="text-sm text-destructive">{errors.toPin.message}</p>}
                                </div>

                                {/* Mobile Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_mobile">
                                        Mobile Number <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="to_mobile" placeholder="Enter 10-digit mobile number" maxLength={10} {...register("toMobile")} disabled={isSubmitting} />
                                    {errors.toMobile && <p className="text-sm text-destructive">{errors.toMobile.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Courier Details Section */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Courier From - Employee Select */}
                                <div className="space-y-2">
                                    <Label htmlFor="emp_from">
                                        Courier from <span className="text-red-500">*</span>
                                    </Label>
                                    <Select onValueChange={value => setValue("empFrom", Number(value))} disabled={isSubmitting || employeesLoading}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={employeesLoading ? "Loading employees..." : "Select Employee"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(employee => (
                                                <SelectItem key={employee.id} value={String(employee.id)}>
                                                    {employee.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.empFrom && <p className="text-sm text-destructive">{errors.empFrom.message}</p>}
                                </div>

                                {/* Expected Delivery Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="del_date">
                                        Expected Delivery Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="del_date" type="date" min={new Date().toISOString().split("T")[0]} {...register("delDate")} disabled={isSubmitting} />
                                    {errors.delDate && <p className="text-sm text-destructive">{errors.delDate.message}</p>}
                                </div>

                                {/* Dispatch Urgency */}
                                <div className="space-y-2">
                                    <Label htmlFor="urgency">
                                        Dispatch Urgency <span className="text-red-500">*</span>
                                    </Label>
                                    <Select onValueChange={value => setValue("urgency", Number(value))} disabled={isSubmitting}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Urgency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Same Day (Urgent)</SelectItem>
                                            <SelectItem value="2">Next Day</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.urgency && <p className="text-sm text-destructive">{errors.urgency.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-4">
                            <Label>Soft Copy of the documents</Label>

                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                                <Input
                                    id="courier_docs"
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.gif,.txt,.pdf,.doc,.docx,.ppt,.pptx"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                />
                                <Label htmlFor="courier_docs" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-medium">Click to upload</span> or drag and drop
                                    </div>
                                    <div className="text-xs text-muted-foreground">Images, PDF, Word, PowerPoint, Text files (Max 25MB total)</div>
                                </Label>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Selected Files ({files.length})</Label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">{getFileIcon(file)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                                    </div>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={isSubmitting} className="h-8 w-8 p-0">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate(paths.shared.couriers ?? "/courier")} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-48">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Courier Request"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CourierForm;
