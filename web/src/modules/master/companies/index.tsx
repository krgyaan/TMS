import { useRef, useState } from "react";

import CompanyDetailsForm, {
    type CompanyFormHandle,
    type PreparedCompanyValues,
} from "./CompanyForm";
import CompanyDocumentsSection, { type DocumentRow } from "./CompanyDocumentsSection";

type CreateCompanyResponse = { id: number; name: string };

type CompanyPayload = PreparedCompanyValues & {
    documents: Array<{
        name: string;
        size: number;
        isFolder: boolean;
    }>;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
}

const Companies = () => {
    const formRef = useRef<CompanyFormHandle | null>(null);
    const [documents, setDocuments] = useState<DocumentRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [serverMessage, setServerMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const handleSubmit = async (values: PreparedCompanyValues) => {
        const payload: CompanyPayload = {
            ...values,
            documents: documents.map((doc) => ({
                name: doc.name,
                size: doc.size,
                isFolder: doc.isFolder,
            })),
        };

        setSubmitting(true);
        setServerMessage(null);
        setServerError(null);
        try {
            const result = await postJson<CreateCompanyResponse>(
                "http://localhost:3000/api/v1/companies",
                payload
            );
            setServerMessage(`Company created successfully (ID: ${result.id})`);
            return true;
        } catch (err: unknown) {
            if (err instanceof Error) {
                setServerError(err.message);
            } else {
                setServerError("Unable to create company");
            }
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setDocuments([]);
        setServerMessage(null);
        setServerError(null);
    };

    const handleSuccess = () => {
        setDocuments([]);
    };

    const handleSaveFromDocuments = () => {
        formRef.current?.submit();
    };

    return (
        <div className="space-y-6">
            <CompanyDetailsForm
                ref={formRef}
                onSubmit={handleSubmit}
                onSuccess={handleSuccess}
                onReset={handleReset}
                submitting={submitting}
                serverMessage={serverMessage}
                serverError={serverError}
            />
            <CompanyDocumentsSection
                documents={documents}
                onDocumentsChange={setDocuments}
                onRequestSave={handleSaveFromDocuments}
                disabled={submitting}
            />
        </div>
    );
};

export default Companies;
