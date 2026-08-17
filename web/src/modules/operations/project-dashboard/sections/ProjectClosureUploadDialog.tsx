import { FormProvider, useForm, useWatch } from "react-hook-form";
import { FileUploader } from "@/components/file-upload";
import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AddProjectClosureDocumentDto, ProjectClosureDocumentRow } from "../helpers/projectClosure.types";
import { CLOSURE_DOCUMENT_CATEGORIES } from "../helpers/projectClosure.types";

interface ProjectClosureUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    initialDocumentName?: string;
    initialFiles?: string[];
    documents: ProjectClosureDocumentRow[];
    isSubmitting?: boolean;
    onSubmit: (data: AddProjectClosureDocumentDto) => void;
}

export const ProjectClosureUploadDialog: React.FC<ProjectClosureUploadDialogProps> = ({
    open,
    onOpenChange,
    initialDocumentName,
    initialFiles,
    documents,
    isSubmitting = false,
    onSubmit,
}) => {
    const form = useForm<{ documentName: string | undefined }>({
        defaultValues: { documentName: undefined },
    });
    const { control, handleSubmit, reset } = form;
    const documentName = useWatch({ control, name: "documentName" });

    const [files, setFiles] = useState<string[]>([]);
    const prevDocumentNameRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (open) {
            reset({ documentName: initialDocumentName ?? undefined });
            setFiles(initialFiles ?? []);
            prevDocumentNameRef.current = initialDocumentName ?? undefined;
        }
    }, [open, initialDocumentName, initialFiles, reset]);

    useEffect(() => {
        if (documentName && documentName !== prevDocumentNameRef.current) {
            setFiles(documents.find(r => r.documentName === documentName)?.files ?? []);
        }
        prevDocumentNameRef.current = documentName;
    }, [documentName, documents]);

    const documentOptions = useMemo(
        () =>
            Object.entries(CLOSURE_DOCUMENT_CATEGORIES).flatMap(([category, documents]) =>
                documents.map(document => ({ value: document, label: document, description: category }))
            ),
        []
    );

    const onSubmitForm = handleSubmit(values => {
        if (!values.documentName) {
            toast.error("Please select a document type");
            return;
        }
        if (files.length === 0) {
            toast.error("Please upload at least one file");
            return;
        }
        onSubmit({ documentName: values.documentName, files });
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Upload Closure Document</DialogTitle>
                    <DialogDescription>
                        Select the document type and upload the required files.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={onSubmitForm} className="space-y-4">
                        <SelectField
                            control={control}
                            name="documentName"
                            label="File Type"
                            options={documentOptions}
                            placeholder="Select Required Document Name"
                        />
                        <FileUploader
                            context="project-closure"
                            value={files}
                            onChange={setFiles}
                            label="Upload Files"
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button type="submit" className="gap-2" disabled={isSubmitting}>
                                <Save className="h-4 w-4" />
                                {isSubmitting ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};
