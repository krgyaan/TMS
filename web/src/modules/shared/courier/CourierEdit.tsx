// // src/modules/shared/courier/edit.tsx
// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
// import { Badge } from "@/components/ui/badge";
// import {
//     ArrowLeft,
//     Building,
//     User,
//     MapPin,
//     Phone,
//     FileText,
//     Package,
//     Calendar,
//     Clock,
//     Loader2,
//     AlertCircle,
//     Save,
//     X,
//     Truck,
//     Upload,
//     Trash2,
//     Eye,
//     CheckCircle,
//     Hash,
// } from "lucide-react";
// import { toast } from "sonner";
// import { paths } from "@/app/routes/paths";

// // Hooks & Types
// import {  useUpdateCourier, useUploadCourierDocs } from "@/modules/shared/courier/courier.hooks";
// import { useUsers } from "@/hooks/api/useUsers";
// import { COURIER_STATUS, COURIER_STATUS_LABELS, type Courier } from "@/modules/shared/courier/courier.types";

// // =====================
// // Validation Schema
// // =====================
// const editCourierSchema = z.object({
//     to_org: z.string().min(1, "Organization name is required"),
//     to_name: z.string().min(1, "Recipient name is required"),
//     to_addr: z.string().min(1, "Address is required"),
//     to_pin: z
//         .string()
//         .min(1, "Pin code is required")
//         .regex(/^\d{6}$/, "Pin code must be 6 digits"),
//     to_mobile: z
//         .string()
//         .min(1, "Mobile number is required")
//         .regex(/^\d{10}$/, "Mobile number must be 10 digits"),
//     emp_from: z.number({ required_error: "Please select a sender" }).int().positive(),
//     del_date: z.string().min(1, "Expected delivery date is required"),
//     urgency: z.number({ required_error: "Please select urgency" }).int().min(1).max(2),
// });

// type EditCourierFormData = z.infer<typeof editCourierSchema>;

// // =====================
// // Modern Styling Constants
// // =====================
// const MODERN_STYLES = {
//     gradient: "bg-gradient-to-b from-background via-background to-muted/10",
//     cardShadow: "shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-shadow duration-300",
//     border: "border-border/20",
//     input: "h-11 rounded-lg border-border/30 focus:border-primary/50 focus:ring-primary/20 transition-all",
//     label: "text-sm font-medium text-muted-foreground mb-2 block",
// };

// // =====================
// // Helper Functions
// // =====================
// const formatDateForInput = (dateStr: string | null): string => {
//     if (!dateStr) return "";
//     const date = new Date(dateStr);
//     return date.toISOString().split("T")[0];
// };

// const formatDate = (dateStr: string | null): string => {
//     if (!dateStr) return "-";
//     return new Date(dateStr).toLocaleDateString("en-GB", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//     });
// };

// const getStatusBadgeVariant = (status: number): string => {
//     const variants: Record<number, string> = {
//         [COURIER_STATUS.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
//         [COURIER_STATUS.DISPATCHED]: "bg-blue-100 text-blue-800 border-blue-200",
//         [COURIER_STATUS.NOT_DELIVERED]: "bg-red-100 text-red-800 border-red-200",
//         [COURIER_STATUS.DELIVERED]: "bg-green-100 text-green-800 border-green-200",
//         [COURIER_STATUS.REJECTED]: "bg-gray-100 text-gray-800 border-gray-200",
//     };
//     return variants[status] || "";
// };

// // =====================
// // Form Field Component
// // =====================
// interface FormFieldProps {
//     icon: React.ElementType;
//     label: string;
//     error?: string;
//     required?: boolean;
//     children: React.ReactNode;
//     description?: string;
// }

// const FormField: React.FC<FormFieldProps> = ({ icon: Icon, label, error, required, children, description }) => (
//     <div className="space-y-2">
//         <div className="flex items-center gap-2">
//             <div className="p-1.5 rounded-lg bg-muted/30">
//                 <Icon className="h-4 w-4 text-muted-foreground" />
//             </div>
//             <Label className={MODERN_STYLES.label}>
//                 {label}
//                 {required && <span className="text-destructive ml-1">*</span>}
//             </Label>
//         </div>
//         {children}
//         {description && !error && <p className="text-xs text-muted-foreground pl-8">{description}</p>}
//         {error && (
//             <p className="text-sm text-destructive flex items-center gap-1 pl-8">
//                 <AlertCircle className="h-3 w-3" />
//                 {error}
//             </p>
//         )}
//     </div>
// );

// // =====================
// // Document Preview Component
// // =====================
// interface DocumentPreviewProps {
//     documents: { url: string; name: string; type: string }[];
//     onRemove?: (index: number) => void;
//     isEditable?: boolean;
// }

// const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documents, onRemove, isEditable = true }) => {
//     if (documents.length === 0) {
//         return (
//             <div className="text-center py-8 border-2 border-dashed border-muted/30 rounded-xl bg-muted/5">
//                 <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
//                 <p className="text-sm text-muted-foreground">No documents attached</p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-2">
//             {documents.map((doc, index) => (
//                 <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/5 hover:bg-muted/10 transition-colors group">
//                     <div className="flex items-center gap-3">
//                         <div className="p-2 rounded-lg bg-primary/10">
//                             <FileText className="h-4 w-4 text-primary" />
//                         </div>
//                         <div>
//                             <p className="text-sm font-medium truncate max-w-[200px]">{doc.name || `Document ${index + 1}`}</p>
//                             <p className="text-xs text-muted-foreground">{doc.type}</p>
//                         </div>
//                     </div>
//                     <div className="flex items-center gap-1">
//                         <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
//                             <a href={doc.url} target="_blank" rel="noopener noreferrer">
//                                 <Eye className="h-4 w-4" />
//                             </a>
//                         </Button>
//                         {isEditable && onRemove && (
//                             <Button
//                                 type="button"
//                                 variant="ghost"
//                                 size="sm"
//                                 className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
//                                 onClick={() => onRemove(index)}
//                             >
//                                 <Trash2 className="h-4 w-4" />
//                             </Button>
//                         )}
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// // =====================
// // Main Component
// // =====================
// const CourierEditPage: React.FC = () => {
//     const navigate = useNavigate();
//     const { id } = useParams<{ id: string }>();
//     const courierId = id ? parseInt(id, 10) : 0;

//     // State for new file uploads
//     const [newFiles, setNewFiles] = useState<File[]>([]);

//     // API Hooks
//     const { data: courier, isLoading, isError, error } = useCourierDetails(courierId);
//     const { data: users = [], isLoading: usersLoading } = useUsers();
//     const updateMutation = useUpdateCourier();
//     const uploadMutation = useUploadCourierDocs();

//     // Form setup
//     const {
//         register,
//         handleSubmit,
//         setValue,
//         watch,
//         reset,
//         formState: { errors, isDirty },
//     } = useForm<EditCourierFormData>({
//         resolver: zodResolver(editCourierSchema),
//     });

//     // Populate form when courier data loads
//     useEffect(() => {
//         if (courier) {
//             reset({
//                 to_org: courier.to_org || "",
//                 to_name: courier.to_name || "",
//                 to_addr: courier.to_addr || "",
//                 to_pin: courier.to_pin || "",
//                 to_mobile: courier.to_mobile || "",
//                 emp_from: courier.emp_from,
//                 del_date: formatDateForInput(courier.del_date),
//                 urgency: courier.urgency,
//             });
//         }
//     }, [courier, reset]);

//     // Form submission
//     const onSubmit = async (data: EditCourierFormData) => {
//         try {
//             // Update courier details
//             await updateMutation.mutateAsync({
//                 id: courierId,
//                 data: data,
//             });

//             // Upload new files if any
//             if (newFiles.length > 0) {
//                 try {
//                     await uploadMutation.mutateAsync({
//                         id: courierId,
//                         files: newFiles,
//                     });
//                 } catch (uploadError) {
//                     console.error("File upload failed:", uploadError);
//                     toast.error("Courier updated but file upload failed");
//                 }
//             }

//             // Navigate back to view page
//             navigate(`/shared/couriers/show/${courierId}`);
//         } catch (error) {
//             // Error handled by mutation
//             console.error("Update failed:", error);
//         }
//     };

//     // File handlers
//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const selectedFiles = Array.from(e.target.files || []);

//         if (selectedFiles.length === 0) return;

//         // Validate file types
//         const allowedTypes = [
//             "image/jpeg",
//             "image/png",
//             "image/gif",
//             "application/pdf",
//             "application/msword",
//             "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         ];

//         const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));

//         if (invalidFiles.length > 0) {
//             toast.error("Invalid file type. Please select images, PDF, or Word documents.");
//             return;
//         }

//         // Validate total size (25MB)
//         const currentSize = newFiles.reduce((sum, f) => sum + f.size, 0);
//         const newSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

//         if (currentSize + newSize > 25 * 1024 * 1024) {
//             toast.error("Total file size must be less than 25MB");
//             return;
//         }

//         setNewFiles(prev => [...prev, ...selectedFiles]);
//         toast.success(`${selectedFiles.length} file(s) added`);

//         // Reset input
//         e.target.value = "";
//     };

//     const removeNewFile = (index: number) => {
//         setNewFiles(prev => prev.filter((_, i) => i !== index));
//         toast.info("File removed");
//     };

//     // Check if form is submitting
//     const isSubmitting = updateMutation.isPending || uploadMutation.isPending;

//     // Loading State
//     if (isLoading) {
//         return (
//             <div className={`min-h-screen ${MODERN_STYLES.gradient} flex items-center justify-center p-6`}>
//                 <div className="text-center space-y-6 max-w-md">
//                     <div className="relative mx-auto w-20 h-20">
//                         <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping"></div>
//                         <div className="absolute inset-2 rounded-full border-4 border-primary/20 animate-spin"></div>
//                         <Truck className="h-10 w-10 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
//                     </div>
//                     <div className="space-y-3">
//                         <h3 className="text-xl font-semibold tracking-tight">Loading Courier Details</h3>
//                         <p className="text-muted-foreground">Preparing edit form...</p>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     // Error State
//     if (isError || !courier) {
//         return (
//             <div className={`min-h-screen ${MODERN_STYLES.gradient} flex items-center justify-center p-6`}>
//                 <Card className={`${MODERN_STYLES.cardShadow} max-w-md`}>
//                     <CardContent className="p-8 text-center space-y-6">
//                         <div className="space-y-3">
//                             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
//                                 <AlertCircle className="h-8 w-8 text-destructive" />
//                             </div>
//                             <div>
//                                 <h3 className="text-xl font-semibold tracking-tight">Courier Not Found</h3>
//                                 <p className="text-muted-foreground mt-2">{(error as any)?.response?.data?.message || "Unable to load courier for editing"}</p>
//                             </div>
//                         </div>
//                         <Button onClick={() => navigate(paths.shared.couriers)} className="gap-2 w-full">
//                             <ArrowLeft className="h-4 w-4" />
//                             Return to Couriers
//                         </Button>
//                     </CardContent>
//                 </Card>
//             </div>
//         );
//     }

//     const existingDocuments = courier.courier_docs || [];

//     return (
//         <div className={`min-h-screen ${MODERN_STYLES.gradient} py-8 px-4 sm:px-6`}>
//             <div className="max-w-5xl mx-auto space-y-8">
//                 {/* Header */}
//                 <div className="space-y-4">
//                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                         <div className="flex items-center gap-3">
//                             <Button
//                                 variant="ghost"
//                                 size="icon"
//                                 onClick={() => navigate(`/shared/couriers/show/${courierId}`)}
//                                 className="rounded-full hover:bg-primary/5 hover:scale-105 transition-all"
//                             >
//                                 <ArrowLeft className="h-5 w-5" />
//                             </Button>
//                             <div>
//                                 <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Edit Courier</h1>
//                                 <div className="flex items-center gap-3 mt-2">
//                                     <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">ID: #{courier.id}</span>
//                                     <Badge className={`${getStatusBadgeVariant(courier.status)} border`}>{COURIER_STATUS_LABELS[courier.status]}</Badge>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="flex items-center gap-2">
//                             <Button variant="outline" onClick={() => navigate(`/shared/couriers/show/${courierId}`)} disabled={isSubmitting}>
//                                 <X className="h-4 w-4 mr-2" />
//                                 Cancel
//                             </Button>
//                             <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || (!isDirty && newFiles.length === 0)}>
//                                 {isSubmitting ? (
//                                     <>
//                                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                                         Saving...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Save className="h-4 w-4 mr-2" />
//                                         Save Changes
//                                     </>
//                                 )}
//                             </Button>
//                         </div>
//                     </div>

//                     <Separator />
//                 </div>

//                 {/* Form */}
//                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
//                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                         {/* Left Column - Recipient Details */}
//                         <Card className={`${MODERN_STYLES.cardShadow} ${MODERN_STYLES.border}`}>
//                             <CardHeader className="border-b">
//                                 <div className="flex items-center gap-3">
//                                     <div className="p-2.5 rounded-xl bg-primary/10">
//                                         <User className="h-6 w-6 text-primary" />
//                                     </div>
//                                     <div>
//                                         <CardTitle className="text-xl">Recipient Details</CardTitle>
//                                         <CardDescription>Update delivery destination information</CardDescription>
//                                     </div>
//                                 </div>
//                             </CardHeader>

//                             <CardContent className="p-6 space-y-6">
//                                 {/* Organization Name */}
//                                 <FormField icon={Building} label="Organization Name" error={errors.to_org?.message} required>
//                                     <Input {...register("to_org")} placeholder="Enter organization name" className={MODERN_STYLES.input} disabled={isSubmitting} />
//                                 </FormField>

//                                 {/* Recipient Name */}
//                                 <FormField icon={User} label="Recipient Name" error={errors.to_name?.message} required>
//                                     <Input {...register("to_name")} placeholder="Enter recipient name" className={MODERN_STYLES.input} disabled={isSubmitting} />
//                                 </FormField>

//                                 {/* Address */}
//                                 <FormField icon={MapPin} label="Delivery Address" error={errors.to_addr?.message} required>
//                                     <Textarea
//                                         {...register("to_addr")}
//                                         placeholder="Enter complete delivery address"
//                                         className="min-h-[100px] rounded-lg border-border/30 focus:border-primary/50 focus:ring-primary/20 transition-all resize-none"
//                                         disabled={isSubmitting}
//                                     />
//                                 </FormField>

//                                 {/* Pin Code & Mobile in Grid */}
//                                 <div className="grid grid-cols-2 gap-4">
//                                     <FormField icon={Hash} label="Pin Code" error={errors.to_pin?.message} required description="6-digit postal code">
//                                         <Input {...register("to_pin")} placeholder="000000" maxLength={6} className={MODERN_STYLES.input} disabled={isSubmitting} />
//                                     </FormField>

//                                     <FormField icon={Phone} label="Mobile Number" error={errors.to_mobile?.message} required description="10-digit mobile number">
//                                         <Input {...register("to_mobile")} placeholder="9876543210" maxLength={10} className={MODERN_STYLES.input} disabled={isSubmitting} />
//                                     </FormField>
//                                 </div>
//                             </CardContent>
//                         </Card>

//                         {/* Right Column - Dispatch Details */}
//                         <Card className={`${MODERN_STYLES.cardShadow} ${MODERN_STYLES.border}`}>
//                             <CardHeader className="border-b">
//                                 <div className="flex items-center gap-3">
//                                     <div className="p-2.5 rounded-xl bg-blue-500/10">
//                                         <Truck className="h-6 w-6 text-blue-600" />
//                                     </div>
//                                     <div>
//                                         <CardTitle className="text-xl">Dispatch Details</CardTitle>
//                                         <CardDescription>Update shipping and urgency information</CardDescription>
//                                     </div>
//                                 </div>
//                             </CardHeader>

//                             <CardContent className="p-6 space-y-6">
//                                 {/* Sender Selection */}
//                                 <FormField icon={User} label="Courier From (Sender)" error={errors.emp_from?.message} required>
//                                     <Select
//                                         value={watch("emp_from")?.toString()}
//                                         onValueChange={value => setValue("emp_from", parseInt(value), { shouldDirty: true })}
//                                         disabled={isSubmitting || usersLoading}
//                                     >
//                                         <SelectTrigger className={MODERN_STYLES.input}>
//                                             <SelectValue placeholder={usersLoading ? "Loading users..." : "Select sender"} />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                             {users.map(user => (
//                                                 <SelectItem key={user.id} value={user.id.toString()}>
//                                                     <div className="flex items-center gap-2">
//                                                         <User className="h-4 w-4 text-muted-foreground" />
//                                                         {user.name}
//                                                     </div>
//                                                 </SelectItem>
//                                             ))}
//                                         </SelectContent>
//                                     </Select>
//                                 </FormField>

//                                 {/* Expected Delivery Date */}
//                                 <FormField icon={Calendar} label="Expected Delivery Date" error={errors.del_date?.message} required>
//                                     <Input type="date" {...register("del_date")} className={MODERN_STYLES.input} disabled={isSubmitting} />
//                                 </FormField>

//                                 {/* Urgency */}
//                                 <FormField icon={Clock} label="Dispatch Urgency" error={errors.urgency?.message} required>
//                                     <Select
//                                         value={watch("urgency")?.toString()}
//                                         onValueChange={value => setValue("urgency", parseInt(value), { shouldDirty: true })}
//                                         disabled={isSubmitting}
//                                     >
//                                         <SelectTrigger className={MODERN_STYLES.input}>
//                                             <SelectValue placeholder="Select urgency level" />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="1">
//                                                 <div className="flex items-center gap-2">
//                                                     <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
//                                                     Same Day (Urgent)
//                                                 </div>
//                                             </SelectItem>
//                                             <SelectItem value="2">
//                                                 <div className="flex items-center gap-2">
//                                                     <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full" />
//                                                     Next Day
//                                                 </div>
//                                             </SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </FormField>

//                                 {/* Read-only Dispatch Info (if dispatched) */}
//                                 {courier.status >= COURIER_STATUS.DISPATCHED && (
//                                     <div className="pt-4 border-t border-muted/20 space-y-4">
//                                         <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dispatch Information (Read-only)</h4>

//                                         <div className="grid grid-cols-2 gap-4">
//                                             <div className="p-3 rounded-lg bg-muted/10 border border-muted/20">
//                                                 <p className="text-xs text-muted-foreground">Provider</p>
//                                                 <p className="font-medium">{courier.courier_provider || "-"}</p>
//                                             </div>
//                                             <div className="p-3 rounded-lg bg-muted/10 border border-muted/20">
//                                                 <p className="text-xs text-muted-foreground">Docket No</p>
//                                                 <p className="font-medium font-mono">{courier.docket_no || "-"}</p>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Documents Section - Full Width */}
//                     <Card className={`${MODERN_STYLES.cardShadow} ${MODERN_STYLES.border}`}>
//                         <CardHeader className="border-b">
//                             <div className="flex items-center justify-between">
//                                 <div className="flex items-center gap-3">
//                                     <div className="p-2.5 rounded-xl bg-green-500/10">
//                                         <FileText className="h-6 w-6 text-green-600" />
//                                     </div>
//                                     <div>
//                                         <CardTitle className="text-xl">Documents</CardTitle>
//                                         <CardDescription>Manage courier documents and attachments</CardDescription>
//                                     </div>
//                                 </div>
//                                 <Badge variant="outline">{existingDocuments.length + newFiles.length} files</Badge>
//                             </div>
//                         </CardHeader>

//                         <CardContent className="p-6">
//                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                                 {/* Existing Documents */}
//                                 <div className="space-y-4">
//                                     <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
//                                         <CheckCircle className="h-4 w-4" />
//                                         Existing Documents
//                                     </h4>
//                                     <DocumentPreview documents={existingDocuments} isEditable={false} />
//                                 </div>

//                                 {/* New Documents */}
//                                 <div className="space-y-4">
//                                     <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
//                                         <Upload className="h-4 w-4" />
//                                         Add New Documents
//                                     </h4>

//                                     {/* File Upload Area */}
//                                     <div className="border-2 border-dashed border-muted/40 rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/5">
//                                         <Input
//                                             id="new_docs"
//                                             type="file"
//                                             className="hidden"
//                                             accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
//                                             multiple
//                                             onChange={handleFileChange}
//                                             disabled={isSubmitting}
//                                         />
//                                         <label htmlFor="new_docs" className="cursor-pointer flex flex-col items-center gap-3">
//                                             <div className="p-3 rounded-full bg-primary/10">
//                                                 <Upload className="h-6 w-6 text-primary" />
//                                             </div>
//                                             <div>
//                                                 <p className="font-medium">Click to upload</p>
//                                                 <p className="text-sm text-muted-foreground mt-1">Images, PDF, Word (Max 25MB total)</p>
//                                             </div>
//                                         </label>
//                                     </div>

//                                     {/* New Files Preview */}
//                                     {newFiles.length > 0 && (
//                                         <div className="space-y-2">
//                                             {newFiles.map((file, index) => (
//                                                 <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-200/50 group">
//                                                     <div className="flex items-center gap-3">
//                                                         <div className="p-2 rounded-lg bg-green-100">
//                                                             <FileText className="h-4 w-4 text-green-600" />
//                                                         </div>
//                                                         <div>
//                                                             <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
//                                                             <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB • New</p>
//                                                         </div>
//                                                     </div>
//                                                     <Button
//                                                         type="button"
//                                                         variant="ghost"
//                                                         size="sm"
//                                                         className="h-8 w-8 p-0 text-destructive"
//                                                         onClick={() => removeNewFile(index)}
//                                                         disabled={isSubmitting}
//                                                     >
//                                                         <Trash2 className="h-4 w-4" />
//                                                     </Button>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>

//                     {/* Form Actions - Bottom */}
//                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
//                         <p className="text-sm text-muted-foreground">
//                             {isDirty || newFiles.length > 0 ? (
//                                 <span className="text-yellow-600 flex items-center gap-1">
//                                     <AlertCircle className="h-4 w-4" />
//                                     You have unsaved changes
//                                 </span>
//                             ) : (
//                                 "All changes saved"
//                             )}
//                         </p>

//                         <div className="flex items-center gap-3">
//                             <Button type="button" variant="outline" onClick={() => navigate(`/shared/couriers/show/${courierId}`)} disabled={isSubmitting} className="gap-2">
//                                 <X className="h-4 w-4" />
//                                 Cancel
//                             </Button>
//                             <Button type="submit" disabled={isSubmitting || (!isDirty && newFiles.length === 0)} className="gap-2 min-w-[140px]">
//                                 {isSubmitting ? (
//                                     <>
//                                         <Loader2 className="h-4 w-4 animate-spin" />
//                                         Saving...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Save className="h-4 w-4" />
//                                         Save Changes
//                                     </>
//                                 )}
//                             </Button>
//                         </div>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default CourierEditPage;
