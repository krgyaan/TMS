import { useEffect, useState } from "react";
import { TiptapEditor } from "@/components/tiptapeditor";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/file-upload";
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
        courierDetails?: string;
    };
    onEmailBodyChange: (html: string) => void;
    initialEmailBody?: string;
    onFilesChange?: (paths: string[]) => void;
}

export function FollowupEmailEditor({
    instrumentType,
    templateData,
    onEmailBodyChange,
    initialEmailBody,
    onFilesChange,
}: FollowupEmailEditorProps) {
    const [htmlContent, setHtmlContent] = useState(initialEmailBody || "");
    const [paths, setPaths] = useState<string[]>([]);

    useEffect(() => {
        if (initialEmailBody) {
            setHtmlContent(initialEmailBody);
            return;
        }
        const html = buildEmailTemplate(instrumentType, templateData);
        setHtmlContent(html);
        onEmailBodyChange(html);
    }, []);

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
                <FileUploader
                    context="follow-ups"
                    value={paths}
                    onChange={(p) => {
                        setPaths(p);
                        onFilesChange?.(p);
                    }}
                />
            </div>
        </div>
    );
}
