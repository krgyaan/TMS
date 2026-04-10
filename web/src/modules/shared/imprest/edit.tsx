import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FormProvider, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { format } from "date-fns";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    Trash2,
    FileText,
    Image as ImageIcon,
    Calendar,
    CheckCircle2,
    XCircle,
    Upload,
    User,
    Loader2,
    Download,
    Eye,
    Shield,
    Clock,
    FileIcon,
} from "lucide-react";

import { paths } from "@/app/routes/paths";
import {
    useImprestDetail,
    useUpdateImprest,
    useUploadImprestProofs,
    useDeleteImprestProof,
} from "./imprest.hooks";
import { updateImprestSchema, type UpdateImprestInput } from "./imprest.schema";
import SelectField from "@/components/form/SelectField";
import SelectInput from "@/components/SelectInput";
import { useProjectOptions } from "@/hooks/useSelectOptions";
import { useImprestCategories } from "@/hooks/api/useImprestCategories";
import { useUsers } from "@/hooks/api/useUsers";
import { cn } from "@/lib/utils";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

const TEAM_MEMBER_CATEGORY_ID = 22;
const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_URL || "/uploads/employeeimprest";

// Helper to determine file type
const getFileType = (filename: string): "image" | "pdf" | "document" => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "")) return "image";
    if (ext === "pdf") return "pdf";
    return "document";
};

// File Preview Component
const FilePreviewCard: React.FC<{
    filename: string;
    onDelete: () => void;
    isDeleting: boolean;
}> = ({ filename, onDelete, isDeleting }) => {
    const fileType = getFileType(filename);
        const fileUrl = `${UPLOADS_BASE_URL}/${filename}`;

        return (
            <div className="group relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md">
                {/* Preview Area */}
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {fileType === "image" ? (
                        <img
                            src={fileUrl}
                            alt={filename}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder-image.png";
                            }}
                        />
                    ) : fileType === "pdf" ? (
                        <div className="flex flex-col items-center gap-2 p-4">
                            <FileText className="h-12 w-12 text-red-500" />
                            <span className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
                                PDF Document
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 p-4">
                            <FileIcon className="h-12 w-12 text-blue-500" />
                            <span className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
                                Document
                            </span>
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            asChild
                        >
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                            </a>
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            asChild
                        >
                            <a href={fileUrl} download={filename}>
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>

                {/* File Info & Actions */}
                <div className="flex items-center justify-between p-2 border-t">
                    <span className="text-xs text-muted-foreground truncate flex-1 pr-2" title={filename}>
                        {filename.length > 20 ? `${filename.slice(0, 20)}...` : filename}
                    </span>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this proof?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently remove "{filename}" from this imprest record.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onDelete}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        );
    };

// Status Badge Component
const StatusBadge: React.FC<{ approved: boolean; label: string }> = ({ approved, label }) => (
    <Badge
        variant={approved ? "default" : "secondary"}
        className={cn(
            "gap-1",
            approved && "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
        )}
    >
        {approved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {label}
    </Badge>
);

const EmployeeImprestEditForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const imprestId = Number(id);

    // Queries
    const { data: imprest, isLoading, isError, error } = useImprestDetail(imprestId);
    const { data: imprestCategories = [] } = useImprestCategories();
    const { data: allUsers = [] } = useUsers();
    const projectOptions = useProjectOptions();

    // Mutations
    const updateMutation = useUpdateImprest();
    const uploadMutation = useUploadImprestProofs();
    const deleteProofMutation = useDeleteImprestProof();

    // Local state
    const [pondFiles, setPondFiles] = useState<File[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");
    const [isApproved, setIsApproved] = useState(false);
    const [approvalDate, setApprovalDate] = useState<string>("");

    // Form setup
    const methods = useForm<UpdateImprestInput>({
        resolver: zodResolver(updateImprestSchema),
        defaultValues: {
            userId: undefined,
            categoryId: undefined,
            partyName: "",
            projectName: "",
            teamId: undefined,
            amount: undefined,
            remark: "",
        },
    });

    const {
        register,
        control,
        formState: { errors, isDirty },
        handleSubmit,
        setValue,
        watch,
        reset,
    } = methods;

    const watchedCategoryId = watch("categoryId");
    const isTransferMode = Number(watchedCategoryId) === TEAM_MEMBER_CATEGORY_ID;

    // Populate form when data loads
    useEffect(() => {
        if (imprest) {
            reset({
                userId: imprest.userId,
                partyName: imprest.partyName,
                projectName: imprest.projectName,
                amount: imprest.amount,
                categoryId: imprest.categoryId,
                teamId: imprest.teamId,
                remark: imprest.remark || "",
            });

            setSelectedUserId(String(imprest.userId));
            setSelectedTransferUserId(imprest.teamId ? String(imprest.teamId) : "");
            setIsApproved(imprest.approvalStatus === 1);
            setApprovalDate(
                imprest.approvedDate
                    ? format(new Date(imprest.approvedDate), "yyyy-MM-dd")
                    : ""
            );
        }
    }, [imprest, reset]);

    // User options
    const userOptions = useMemo(
        () =>
            allUsers
                .filter((u) => u.isActive === true)
                .map((u) => ({
                    id: String(u.id),
                    name: u.name?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) || "",
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [allUsers]
    );

    // Transfer user options (exclude current user)
    const transferUserOptions = useMemo(
        () => userOptions.filter((u) => u.id !== selectedUserId),
        [userOptions, selectedUserId]
    );

    // Existing proofs
    const existingProofs: string[] = Array.isArray(imprest?.invoiceProof)
        ? imprest.invoiceProof
        : [];

    // Handle form submission
    const onSubmit = async (data: UpdateImprestInput) => {
        try {
            // 1. Update imprest data
            await updateMutation.mutateAsync({
            id: imprestId,
            data: {
                ...data,
                userId: data.userId,
                teamId: isTransferMode ? data.teamId : null,
                approvalStatus: isApproved ? 1 : 0,
                approvedDate: isApproved && approvalDate ? approvalDate : null,
            },
            });

            // 2. Upload new files if any
            if (pondFiles.length > 0) {
                await uploadMutation.mutateAsync({
                    id: imprestId,
                    files: pondFiles,
                });
            }

            if(imprest?.userId) {
                navigate(paths.shared.imprestUser(imprest.userId))
            } else {
                navigate(paths.accounts.imprests)
            }

        } catch (err) {
            console.error("Failed to update imprest:", err);
        }
    };

    // Handle proof deletion
    const handleDeleteProof = async (filename: string) => {
        await deleteProofMutation.mutateAsync({ id: imprestId, filename });
    };

    // Handle FilePond updates
    const handlePondProcess = (items: any[]) => {
        setPondFiles(items.map((fi) => fi.file).filter(Boolean));
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-20" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="container mx-auto py-6">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <XCircle className="h-12 w-12 text-destructive" />
                            <div className="text-center">
                                <h3 className="font-semibold text-lg">Failed to load imprest</h3>
                                <p className="text-muted-foreground text-sm">
                                    {error instanceof Error ? error.message : "An unexpected error occurred"}
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => navigate(paths.shared.imprest)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to List
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isPending = updateMutation.isPending || uploadMutation.isPending;

    return (
        <div className="container mx-auto py-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.shared.imprest)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Imprest #{imprestId}</h1>
                        <p className="text-muted-foreground">
                            Modify imprest details, manage proofs, and update approval status
                        </p>
                    </div>
                </div>

                {/* Quick Status Badges */}
                <div className="hidden md:flex items-center gap-2">
                    <StatusBadge
                        approved={imprest?.approvalStatus === 1}
                        label={imprest?.approvalStatus === 1 ? "Approved" : "Pending"}
                    />
                    <StatusBadge
                        approved={imprest?.proofStatus === 1}
                        label={imprest?.proofStatus === 1 ? "Proof Verified" : "Proof Pending"}
                    />
                    <StatusBadge
                        approved={imprest?.tallyStatus === 1}
                        label={imprest?.tallyStatus === 1 ? "In Tally" : "Not in Tally"}
                    />
                </div>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Main Form - Left Column */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Basic Information Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                    <CardDescription>
                                        Update the imprest details and category
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Assigned User */}
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Assigned To
                                            </Label>
                                            <Controller
                                                control={control}
                                                name="userId"
                                                render={({ field }) => (
                                                    <SelectInput
                                                    value={field.value ? String(field.value) : ""}
                                                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                                                    options={userOptions}
                                                    placeholder="-- Select User --"
                                                    />
                                                )}
                                                />

                                                {errors.userId && (
                                                <p className="text-sm text-destructive">
                                                    {errors.userId.message}
                                                </p>
                                                )}
                                        </div>

                                        {/* Category */}
                                        <SelectField
                                            control={control}
                                            name="categoryId"
                                            label="Category"
                                            placeholder="-- Select Category --"
                                            options={imprestCategories.map((i) => ({
                                                id: String(i.id),
                                                name: i.name,
                                            }))}
                                        />

                                        {/* Party Name - Hidden in transfer mode */}
                                        {!isTransferMode && (
                                            <div className="space-y-2">
                                                <Label>Party Name</Label>
                                                <Input
                                                    placeholder="Enter party name"
                                                    {...register("partyName")}
                                                />
                                                {errors.partyName && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.partyName.message}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Project - Hidden in transfer mode */}
                                        {!isTransferMode && (
                                            <SelectField
                                                control={control}
                                                name="projectName"
                                                label="Project"
                                                placeholder="-- Select Project --"
                                                options={projectOptions}
                                            />
                                        )}

                                        {/* Transfer To - Only in transfer mode */}
                                        {isTransferMode && (
                                            <div className="space-y-2">
                                                <Controller
                                                control={control}
                                                name="teamId"
                                                render={({ field }) => (
                                                    <SelectInput
                                                    value={field.value ? String(field.value) : ""}
                                                    onChange={(val) => field.onChange(Number(val))}
                                                    options={transferUserOptions}
                                                    placeholder="-- Select Team Member --"
                                                    />
                                                )}
                                                />

                                                {errors.teamId && (
                                                <p className="text-sm text-destructive">
                                                    {errors.teamId.message}
                                                </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Amount */}
                                        <div className="space-y-2">
                                            <Label>Amount</Label>
                                            <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                {...register("amount")}
                                            />
                                            {errors.amount && (
                                                <p className="text-sm text-destructive">
                                                    {errors.amount.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Remarks */}
                                    <div className="space-y-2">
                                        <Label>Remarks</Label>
                                        <Textarea
                                            rows={3}
                                            placeholder="Add any additional notes..."
                                            {...register("remark")}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Proof Documents Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="h-5 w-5" />
                                        Proof Documents
                                    </CardTitle>
                                    <CardDescription>
                                        Manage existing proofs and upload new documents
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Existing Proofs */}
                                    {existingProofs.length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">
                                                Existing Proofs ({existingProofs.length})
                                            </Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {existingProofs.map((filename) => (
                                                    <FilePreviewCard
                                                        key={filename}
                                                        filename={filename}
                                                        onDelete={() => handleDeleteProof(filename)}
                                                        isDeleting={
                                                            deleteProofMutation.isPending &&
                                                            deleteProofMutation.variables?.filename === filename
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {existingProofs.length > 0 && <Separator />}

                                    {/* Upload New Files */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Add New Proofs</Label>
                                        <FilePond
                                            files={pondFiles}
                                            onupdatefiles={handlePondProcess}
                                            allowMultiple
                                            acceptedFileTypes={[
                                                "image/*",
                                                "application/pdf",
                                                "application/msword",
                                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                                "text/plain",
                                            ]}
                                            labelIdle='Drag & drop files or <span class="filepond--label-action">Browse</span>'
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar - Right Column */}
                        <div className="space-y-6">
                            {/* Approval Management Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Approval Management
                                    </CardTitle>
                                    <CardDescription>
                                        Control approval status and date
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Approval Toggle */}
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Approval Status</Label>
                                            <p className="text-sm text-muted-foreground">
                                                {isApproved ? "This imprest is approved" : "This imprest is pending approval"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={isApproved}
                                            onCheckedChange={(checked) => {
                                                setIsApproved(checked);
                                                if (checked && !approvalDate) {
                                                    setApprovalDate(format(new Date(), "yyyy-MM-dd"));
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Approval Date */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Approval Date
                                        </Label>
                                        <Input
                                            type="date"
                                            value={approvalDate}
                                            onChange={(e) => setApprovalDate(e.target.value)}
                                            disabled={!isApproved}
                                            className={cn(!isApproved && "opacity-50")}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Set a custom approval date for this imprest
                                        </p>
                                    </div>

                                    <Separator />

                                    {/* Current Status Display */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Current Statuses</Label>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Proof Status</span>
                                                <StatusBadge
                                                    approved={imprest?.proofStatus === 1}
                                                    label={imprest?.proofStatus === 1 ? "Verified" : "Pending"}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Tally Status</span>
                                                <StatusBadge
                                                    approved={imprest?.tallyStatus === 1}
                                                    label={imprest?.tallyStatus === 1 ? "Added" : "Not Added"}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Metadata Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Clock className="h-4 w-4" />
                                        Record Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Created</dt>
                                            <dd className="font-medium">
                                                {imprest?.createdAt
                                                    ? format(new Date(imprest.createdAt), "MMM dd, yyyy")
                                                    : "—"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Last Updated</dt>
                                            <dd className="font-medium">
                                                {imprest?.updatedAt
                                                    ? format(new Date(imprest.updatedAt), "MMM dd, yyyy")
                                                    : "—"}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Imprest ID</dt>
                                            <dd className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                                #{imprestId}
                                            </dd>
                                        </div>
                                    </dl>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isPending}
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate(paths.shared.imprest)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};

export default EmployeeImprestEditForm;