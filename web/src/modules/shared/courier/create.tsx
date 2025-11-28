import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileText, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { paths } from "@/app/routes/paths";

// Validation schema
const courierFormSchema = z.object({
    to_org: z.string().min(1, "Organization name is required"),
    to_name: z.string().min(1, "Recipient name is required"),
    to_addr: z.string().min(1, "Address is required"),
    to_pin: z.string().min(1, "Pin code is required"),
    to_mobile: z.string().min(1, "Mobile number is required"),
    emp_from: z.string().min(1, "Please select an employee"),
    del_date: z.string().min(1, "Expected delivery date is required"),
    urgency: z.string().min(1, "Please select dispatch urgency"),
    courier_docs: z.instanceof(FileList).optional(),
});

type CourierFormData = z.infer<typeof courierFormSchema>;

// Mock data - replace with actual API call
const mockEmployees = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Mike Johnson" },
    { id: "4", name: "Sarah Wilson" },
];

const CourierForm = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<CourierFormData>({
        resolver: zodResolver(courierFormSchema),
        defaultValues: {
            to_org: "",
            to_name: "",
            to_addr: "",
            to_pin: "",
            to_mobile: "",
            emp_from: "",
            del_date: "",
            urgency: "",
        },
    });

    const onSubmit = async (data: CourierFormData) => {
        setIsSubmitting(true);

        const toastId = toast.loading("Submitting courier request...");

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success("Courier request submitted successfully!", {
                id: toastId,
                description: `Request for ${data.to_name} has been created.`,
                action: {
                    label: "View All",
                    onClick: () => navigate("/courier"),
                },
            });

            navigate("/courier");
        } catch (error) {
            toast.error("Failed to submit courier request", {
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
        const selectedFiles = Array.from(event.target.files || []);

        if (selectedFiles.length > 0) {
            // Validate file types
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

            const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));

            if (invalidFiles.length > 0) {
                toast.error("Invalid file type", {
                    description: "Please select valid files (images, PDF, Word, PowerPoint, or text files).",
                });
                return;
            }

            // Validate total file size (25MB)
            const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
            if (totalSize > 25 * 1024 * 1024) {
                toast.error("Files too large", {
                    description: "Total file size must be less than 25MB.",
                });
                return;
            }

            setFiles(prev => [...prev, ...selectedFiles]);
            toast.success("Files selected", {
                description: `${selectedFiles.length} file(s) added for upload.`,
            });
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        toast.info("File removed", {
            description: "File has been removed from the upload list.",
        });
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith("image/")) {
            return "🖼️";
        } else if (file.type === "application/pdf") {
            return "📄";
        } else if (file.type.includes("word") || file.type.includes("document")) {
            return "📝";
        } else if (file.type.includes("presentation")) {
            return "📊";
        } else {
            return "📎";
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(paths.shared.couriers)} className="flex items-center space-x-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Courier Form</h1>
                        <p className="text-muted-foreground">Create a new courier dispatch request</p>
                    </div>
                </div>
            </div>

            {/* Courier Form */}
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
                                    <Label htmlFor="to_org">Organization Name</Label>
                                    <Input id="to_org" placeholder="Enter organization name" {...register("to_org")} />
                                    {errors.to_org && <p className="text-sm text-destructive">{errors.to_org.message}</p>}
                                </div>

                                {/* Recipient Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_name">Name</Label>
                                    <Input id="to_name" placeholder="Enter recipient name" {...register("to_name")} />
                                    {errors.to_name && <p className="text-sm text-destructive">{errors.to_name.message}</p>}
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_addr">Address</Label>
                                    <Input id="to_addr" placeholder="Enter complete address" {...register("to_addr")} />
                                    {errors.to_addr && <p className="text-sm text-destructive">{errors.to_addr.message}</p>}
                                </div>

                                {/* Pin Code */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_pin">Pin Code</Label>
                                    <Input id="to_pin" placeholder="Enter pin code" {...register("to_pin")} />
                                    {errors.to_pin && <p className="text-sm text-destructive">{errors.to_pin.message}</p>}
                                </div>

                                {/* Mobile Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="to_mobile">Mobile Number</Label>
                                    <Input id="to_mobile" placeholder="Enter mobile number" {...register("to_mobile")} />
                                    {errors.to_mobile && <p className="text-sm text-destructive">{errors.to_mobile.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Courier Details Section */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Courier From */}
                                <div className="space-y-2">
                                    <Label htmlFor="emp_from">Courier from</Label>
                                    <Select onValueChange={value => setValue("emp_from", value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mockEmployees.map(employee => (
                                                <SelectItem key={employee.id} value={employee.id}>
                                                    {employee.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.emp_from && <p className="text-sm text-destructive">{errors.emp_from.message}</p>}
                                </div>

                                {/* Expected Delivery Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="del_date">Expected Delivery Date</Label>
                                    <Input id="del_date" type="date" {...register("del_date")} />
                                    {errors.del_date && <p className="text-sm text-destructive">{errors.del_date.message}</p>}
                                </div>

                                {/* Dispatch Urgency */}
                                <div className="space-y-2">
                                    <Label htmlFor="urgency">Dispatch Urgency</Label>
                                    <Select onValueChange={value => setValue("urgency", value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Urgency" />
                                        </SelectTrigger>
                                        <SelectContent className="w-full">
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
                            <Label htmlFor="courier_docs">Soft Copy of the documents</Label>

                            {/* File Upload Area */}
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                                <Input
                                    id="courier_docs"
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.gif,.txt,.pdf,.doc,.docx,.ppt,.pptx"
                                    multiple
                                    onChange={handleFileChange}
                                />
                                <Label htmlFor="courier_docs" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-medium">Click to upload</span> or drag and drop
                                    </div>
                                    <div className="text-xs text-muted-foreground">Supports multiple files: Images, PDF, Word, PowerPoint, Text files (Max 25MB total)</div>
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
                                                        <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-8 w-8 p-0">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.courier_docs && <p className="text-sm text-destructive">{errors.courier_docs.message}</p>}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting} className="flex items-center space-x-2 min-w-48" size="lg">
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit Courier Request</span>
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
