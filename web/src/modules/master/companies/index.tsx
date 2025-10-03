import { useEffect, useRef, useState } from "react";

import CompanyDetailsForm, {
    type CompanyFormHandle,
    type PreparedCompanyValues,
} from "./CompanyForm";
import CompanyDocumentsSection, { type DocumentRow } from "./CompanyDocumentsSection";

type CompanyDocumentResponse = {
    id: number;
    name: string;
    size: number;
    isFolder: boolean;
    companyId?: number;
    url?: string | null;
};

type CompanyResponse = {
    id: number;
    name: string;
    entityType: string;
    registeredAddress: string;
    branchAddresses: string[] | null;
    about: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    fax: string | null;
    signatoryName: string | null;
    designation: string | null;
    tenderKeywords: string[] | null;
    documents: CompanyDocumentResponse[] | null;
    createdAt?: string;
    updatedAt?: string;
};

const COMPANIES_API = "http://localhost:3000/api/v1/companies";

async function requestJson<T>(url: string, method: "GET" | "POST" | "PUT", body?: unknown): Promise<T> {
    const init: RequestInit = { method };
    if (body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
}

const fetchCompanies = () => requestJson<CompanyResponse[]>(COMPANIES_API, "GET");
const createCompany = (payload: PreparedCompanyValues) => requestJson<CompanyResponse>(COMPANIES_API, "POST", payload);
const updateCompany = (id: number, payload: PreparedCompanyValues) =>
    requestJson<CompanyResponse>(`${COMPANIES_API}/${id}`, "PUT", payload);
const updateCompanyDocuments = (id: number, documents: DocumentRow[]) =>
    requestJson<CompanyResponse>(`${COMPANIES_API}/${id}/documents`, "PUT", {
        documents: documents.map((doc) => ({
            name: doc.name,
            size: doc.size,
            isFolder: doc.isFolder,
        })),
    });

const toPreparedValues = (company: CompanyResponse): PreparedCompanyValues => ({
    name: company.name ?? "",
    entityType: company.entityType ?? "",
    registeredAddress: company.registeredAddress ?? "",
    branchAddresses: Array.isArray(company.branchAddresses) ? company.branchAddresses : [],
    about: company.about ?? "",
    website: company.website ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    fax: company.fax ?? "",
    signatoryName: company.signatoryName ?? "",
    designation: company.designation ?? "",
    tenderKeywords: Array.isArray(company.tenderKeywords) ? company.tenderKeywords : [],
});

const toDocumentRows = (docs: CompanyDocumentResponse[] | null | undefined): DocumentRow[] =>
    Array.isArray(docs)
        ? docs.map((doc) => ({
              id: String(doc.id ?? `${doc.companyId ?? "company"}-${doc.name}`),
              name: doc.name,
              size: typeof doc.size === "number" ? doc.size : 0,
              isFolder: Boolean(doc.isFolder),
              file: null,
              previewUrl: null,
              url: doc.url ?? null,
          }))
        : [];

const Companies = () => {
    const formRef = useRef<CompanyFormHandle | null>(null);
    const [initializing, setInitializing] = useState(true);

    const [companyId, setCompanyId] = useState<number | null>(null);
    const [initialValues, setInitialValues] = useState<PreparedCompanyValues | null>(null);
    const [initialDocuments, setInitialDocuments] = useState<DocumentRow[]>([]);

    const [documents, setDocuments] = useState<DocumentRow[]>([]);

    const [detailsSubmitting, setDetailsSubmitting] = useState(false);
    const [documentsSubmitting, setDocumentsSubmitting] = useState(false);

    const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [documentsMessage, setDocumentsMessage] = useState<string | null>(null);
    const [documentsError, setDocumentsError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        const load = async () => {
            try {
                const companies = await fetchCompanies();
                if (ignore) return;

                if (Array.isArray(companies) && companies.length > 0) {
                    const company = companies[0];
                    setCompanyId(company.id);
                    const prepared = toPreparedValues(company);
                    setInitialValues(prepared);
                    const docRows = toDocumentRows(company.documents);
                    setDocuments(docRows);
                    setInitialDocuments(docRows);
                } else {
                    setCompanyId(null);
                    setInitialValues(null);
                    setDocuments([]);
                    setInitialDocuments([]);
                }
                setDetailsMessage(null);
                setDetailsError(null);
                setDocumentsMessage(null);
                setDocumentsError(null);
            } catch (error) {
                if (ignore) return;
                setDetailsError(error instanceof Error ? error.message : "Unable to load company data");
            } finally {
                if (!ignore) {
                    setInitializing(false);
                }
            }
        };

        void load();

        return () => {
            ignore = true;
        };
    }, []);

    const handleDetailsSubmit = async (values: PreparedCompanyValues) => {
        const payload = values;

        setDetailsSubmitting(true);
        setDetailsMessage(null);
        setDetailsError(null);
        try {
            let result: CompanyResponse;
            if (companyId) {
                result = await updateCompany(companyId, payload);
                setDetailsMessage("Company details updated successfully");
            } else {
                result = await createCompany(payload);
                setDetailsMessage(`Company created successfully (ID: ${result.id})`);
            }

            setCompanyId(result.id);
            const prepared = toPreparedValues(result);
            setInitialValues(prepared);
            const docRows = toDocumentRows(result.documents);
            setDocuments(docRows);
            setInitialDocuments(docRows);
            return true;
        } catch (err: unknown) {
            if (err instanceof Error) {
                setDetailsError(err.message);
            } else {
                setDetailsError("Unable to save company details");
            }
            return false;
        } finally {
            setDetailsSubmitting(false);
        }
    };

    const handleReset = () => {
        setDocuments(initialDocuments);
        setDetailsMessage(null);
        setDetailsError(null);
        setDocumentsMessage(null);
        setDocumentsError(null);
    };

    const handleDocumentsChange = (next: DocumentRow[]) => {
        setDocuments(next);
        setDocumentsMessage(null);
        setDocumentsError(null);
    };

    const handleDocumentsSave = async () => {
        if (!companyId) {
            setDocumentsError("Save company details before uploading documents.");
            return;
        }
        setDocumentsSubmitting(true);
        setDocumentsMessage(null);
        setDocumentsError(null);
        try {
            const result = await updateCompanyDocuments(companyId, documents);
            const docRows = toDocumentRows(result.documents);
            setDocuments(docRows);
            setInitialDocuments(docRows);
            setDocumentsMessage("Documents updated successfully");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setDocumentsError(err.message);
            } else {
                setDocumentsError("Unable to update documents");
            }
        } finally {
            setDocumentsSubmitting(false);
        }
    };

    const detailsBusy = initializing || detailsSubmitting;
    const documentsDisabled = initializing || documentsSubmitting || !companyId;
    const mode = companyId ? "update" : "create";
    const documentsHelperText = !companyId ? "Save company details before adding documents." : null;

    return (
        <div className="space-y-6">
            <CompanyDetailsForm
                ref={formRef}
                mode={mode}
                initialValues={initialValues}
                onSubmit={handleDetailsSubmit}
                onReset={handleReset}
                submitting={detailsBusy}
                serverMessage={detailsMessage}
                serverError={detailsError}
            />
            <CompanyDocumentsSection
                documents={documents}
                onDocumentsChange={handleDocumentsChange}
                onSave={handleDocumentsSave}
                saving={documentsSubmitting}
                serverMessage={documentsMessage}
                serverError={documentsError}
                disabled={documentsDisabled}
                helperText={documentsHelperText}
            />
        </div>
    );
};

export default Companies;