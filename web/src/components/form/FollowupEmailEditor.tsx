import { useEffect, useState, useRef } from "react";
import { TiptapEditor } from "@/components/tiptapeditor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";
import { buildEmailTemplate } from "@/modules/shared/follow-up/emailTemplateBuilder";

interface FollowupEmailEditorProps {
    instrumentType: string;
    templateData: {
        tenderNo?: string | null;
        projectName?: string | null;
        status?: string | null;
        amount?: string | number | null;
        date?: string | null;
        utr?: string | null;
        utrNo?: string | null;
        ddNo?: string | null;
        fdrNo?: string | null;
        expiryDate?: string | null;
        transactionDate?: string | null;
    };
    onEmailBodyChange: (html: string) => void;
    initialEmailBody?: string;
    onFilesChange?: (files: File[]) => void;
}

export function FollowupEmailEditor({
    instrumentType,
    templateData,
    onEmailBodyChange,
    initialEmailBody,
    onFilesChange,
}: FollowupEmailEditorProps) {
    const [htmlContent, setHtmlContent] = useState(initialEmailBody || "");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialEmailBody) {
            setHtmlContent(initialEmailBody);
            return;
        }
        const html = buildEmailTemplate(instrumentType, templateData);
        setHtmlContent(html);
        onEmailBodyChange(html);
    }, []);

    const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...newFiles]);
        onFilesChange?.([...files, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        onFilesChange?.(updated);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-sm font-medium">Email Body</Label>
                <p className="text-xs text-muted-foreground mb-2">
                    Edit the follow-up email content below. Template auto-populated from instrument data.
                </p>
                <TiptapEditor
                    value={htmlContent}
                    onChange={(val) => {
                        setHtmlContent(val);
                        onEmailBodyChange(val);
                    }}
                    minHeight="200px"
                    placeholder="Write email content..."
                />
            </div>

            <div>
                <Label className="text-sm font-medium">Attachments</Label>
                <p className="text-xs text-muted-foreground mb-2">
                    Add supporting documents (proof, letters, etc.)
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-md px-3 py-1.5 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleAddFiles}
                        className="hidden"
                        id="followup-attachments"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4 mr-1" />
                        Add Files
                    </Button>
                </div>
            </div>
        </div>
    );
}
