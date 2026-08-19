import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { followupsService } from '@/services/api/followups.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import { useLead } from './useLeads';
import { useHappyCalling } from './useHappyCalling';
import { paths } from '@/app/routes/paths';
import type {
    CreateFollowupRequest,
    ContactPerson,
    VisitFollowupRequest,
    CallFollowupRequest,
    MailFollowupRequest,
    WhatsappFollowupRequest,
    LetterFollowupRequest,
    FollowupSource,
} from '@/modules/crm/followups/helpers/followup.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const followupsKey = {
    all: ['followups'] as const,
    bySource: (sourceType: string, sourceId: number) => [...followupsKey.all, sourceType, sourceId] as const,
    detail: (sourceType: string, sourceId: number, id: number) => [...followupsKey.bySource(sourceType, sourceId), id] as const,
};

// ─── Source Helpers ───────────────────────────────────────────────────────────

export const sourceHistoryPath = (source: FollowupSource): string =>
    source.sourceType === 'lead'
        ? paths.crm.leadFollowupHistory(source.sourceId)
        : paths.crm.happyCallingFollowupHistory(source.sourceId);

export const sourceFollowupPath = (source: FollowupSource): string =>
    source.sourceType === 'lead'
        ? paths.crm.leadFollowup(source.sourceId)
        : paths.crm.happyCallingFollowup(source.sourceId);

export interface SourceRecordLike {
    leadContacts?: ContactPerson[] | null;
    name?: string | null;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export const seedContactsFromSource = (record: SourceRecordLike | undefined): ContactPerson[] => {
    if (!record) return [];
    const leadContacts = 'leadContacts' in record ? record.leadContacts : null;
    if (Array.isArray(leadContacts) && leadContacts.length > 0) {
        return leadContacts.map((c: ContactPerson) => ({
            name: c.name || "",
            designation: c.designation || "",
            phone: c.phone || "",
            email: c.email || "",
        }));
    }
    if (record.name || record.designation || record.phone || record.email) {
        return [{
            name: record.name || "",
            designation: record.designation || "",
            phone: record.phone || "",
            email: record.email || "",
        }];
    }
    return [];
};

export const useSourceRecord = (source: FollowupSource): SourceRecordLike | undefined => {
    const { data: lead } = useLead(source.sourceType === 'lead' ? source.sourceId : null);
    const { data: happyCalling } = useHappyCalling(source.sourceType === 'happy_calling' ? source.sourceId : null);
    return source.sourceType === 'lead'
        ? (lead as unknown as SourceRecordLike | undefined)
        : (happyCalling as unknown as SourceRecordLike | undefined);
};

// ─── Utility Functions ────────────────────────────────────────────────────────

export const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

export const canEditFollowup = (createdAt: string): boolean => {
    return isToday(createdAt);
};

export const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return "";
    }
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const VisitSchema = z.object({
    body: z.string().min(1, { message: "Points discussed is required" }),
    veResponsibility: z.string().optional().nullable(),
    nextFollowupDate: z.string().optional().nullable(),
});

export const CallSchema = z.object({
    body: z.string().min(1, { message: "Points discussed is required" }),
    veResponsibility: z.string().optional().nullable(),
    nextFollowupDate: z.string().optional().nullable(),
});

export const MailSchema = z.object({
    body: z.string().min(1, { message: "Mail body is required" }),
    frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
    nextFollowupDate: z.string().optional().nullable(),
});

export const WhatsappSchema = z.object({
    body: z.string().min(1, { message: "Please enter what you sent" }),
    nextFollowupDate: z.string().optional().nullable(),
});

export const LetterSchema = z.object({
    toOrg: z.string().min(1, { message: "Organization name is required" }),
    toName: z.string().min(1, { message: "Recipient name is required" }),
    toAddr: z.string().min(1, { message: "Address is required" }),
    toPin: z.string().min(1, { message: "Pin code is required" }),
    toMobile: z.string().min(1, { message: "Mobile number is required" }),
    empFrom: z.string().min(1, { message: "Please select an employee" }),
    delDate: z.string().min(1, { message: "Expected delivery date is required" }),
    urgency: z.string().min(1, { message: "Please select urgency" }),
    nextFollowupDate: z.string().optional().nullable(),
});

export type VisitFormValues = z.infer<typeof VisitSchema>;
export type CallFormValues = z.infer<typeof CallSchema>;
export type MailFormValues = z.infer<typeof MailSchema>;
export type WhatsappFormValues = z.infer<typeof WhatsappSchema>;
export type LetterFormValues = z.infer<typeof LetterSchema>;

// ─── Basic CRUD Hooks ─────────────────────────────────────────────────────────

export const useFollowups = (source: FollowupSource) => {
    return useQuery({
        queryKey: followupsKey.bySource(source.sourceType, source.sourceId),
        queryFn: () => followupsService.getAll(source),
        enabled: !!source.sourceId,
    });
};

export const useFollowup = (source: FollowupSource, followupId: number) => {
    return useQuery({
        queryKey: followupsKey.detail(source.sourceType, source.sourceId, followupId),
        queryFn: () => followupsService.getById(source, followupId),
        enabled: !!source.sourceId && !!followupId,
    });
};

const invalidateSource = (queryClient: QueryClient, source: FollowupSource) => {
    queryClient.invalidateQueries({ queryKey: followupsKey.bySource(source.sourceType, source.sourceId) });
    if (source.sourceType === 'lead') {
        queryClient.invalidateQueries({ queryKey: ['leads', 'detail', source.sourceId] });
    } else {
        queryClient.invalidateQueries({ queryKey: ['happy-calling', 'detail', source.sourceId] });
    }
};

export const useCreateFollowup = (source: FollowupSource) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateFollowupRequest) =>
            followupsService.create(source, data),
        onSuccess: () => {
            invalidateSource(queryClient, source);
            toast.success('Follow-up saved successfully');
        },
        onError: showErrorToast,
    });
};

export const useUpdateFollowup = (source: FollowupSource) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ followupId, data }: { followupId: number; data: CreateFollowupRequest }) =>
            followupsService.update(source, followupId, data),
        onSuccess: () => {
            invalidateSource(queryClient, source);
            toast.success('Follow-up updated successfully');
        },
        onError: showErrorToast,
    });
};

export const useDeleteFollowup = (source: FollowupSource) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (followupId: number) =>
            followupsService.remove(source, followupId),
        onSuccess: () => {
            invalidateSource(queryClient, source);
            toast.success('Follow-up deleted successfully');
        },
        onError: showErrorToast,
    });
};

// ─── Visit Form Hook ──────────────────────────────────────────────────────────
// ── UNCHANGED ────────────────────────────────────────────────────────────────

export const useVisitForm = (source: FollowupSource) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(source);
    const updateFollowup = useUpdateFollowup(source);
    const sourceRecord = useSourceRecord(source);
    const { data: allFollowups = [] } = useFollowups(source);

    const existingFollowup = isEditMode
        ? allFollowups.find(f => f.id === followupId) ?? null
        : null;

    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [lockedCount, setLockedCount] = useState(0);

    const form = useForm<VisitFormValues>({
        resolver: zodResolver(VisitSchema),
        defaultValues: {
            body: "",
            veResponsibility: "",
            nextFollowupDate: "",
        },
    });

    useEffect(() => {
        if (isEditMode && existingFollowup) {
            form.reset({
                body: existingFollowup.body || "",
                veResponsibility: existingFollowup.veResponsibility || "",
                nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
            });
            setContacts(existingFollowup.contacts || []);
            setLockedCount(0);
        }
    }, [existingFollowup, isEditMode, form]);

    useEffect(() => {
        if (isEditMode) return;

        const seeded = seedContactsFromSource(sourceRecord);
        if (seeded.length > 0) {
            setContacts(seeded);
            setLockedCount(seeded.length);
        }
    }, [sourceRecord, isEditMode]);

    const handleSubmit = async (values: VisitFormValues) => {
        const payload: VisitFollowupRequest = {
            type: 'visit',
            body: values.body,
            veResponsibility: values.veResponsibility || null,
            contacts,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(sourceHistoryPath(source));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();

                const seeded = seedContactsFromSource(sourceRecord);
                if (seeded.length > 0) {
                    setContacts(seeded);
                    setLockedCount(seeded.length);
                }
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(sourceHistoryPath(source));
    };

    return {
        form,
        contacts,
        setContacts,
        lockedCount,
        isEditMode,
        saving: createFollowup.isPending || updateFollowup.isPending,
        handleSubmit,
        handleCancelEdit,
    };
};

// ─── Call Form Hook ───────────────────────────────────────────────────────────
// ── UNCHANGED ────────────────────────────────────────────────────────────────

export const useCallForm = (source: FollowupSource) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(source);
    const updateFollowup = useUpdateFollowup(source);
    const sourceRecord = useSourceRecord(source);
    const { data: allFollowups = [] } = useFollowups(source);

    const existingFollowup = isEditMode
        ? allFollowups.find(f => f.id === followupId) ?? null
        : null;

    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [lockedCount, setLockedCount] = useState(0);

    const form = useForm<CallFormValues>({
        resolver: zodResolver(CallSchema),
        defaultValues: {
            body: "",
            veResponsibility: "",
            nextFollowupDate: "",
        },
    });

    useEffect(() => {
        if (isEditMode && existingFollowup) {
            form.reset({
                body: existingFollowup.body || "",
                veResponsibility: existingFollowup.veResponsibility || "",
                nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
            });
            setContacts(existingFollowup.contacts || []);
            setLockedCount(0);
        }
    }, [existingFollowup, isEditMode, form]);

    useEffect(() => {
        if (isEditMode) return;

        const seeded = seedContactsFromSource(sourceRecord);
        if (seeded.length > 0) {
            setContacts(seeded);
            setLockedCount(seeded.length);
        }
    }, [sourceRecord, isEditMode]);

    const handleSubmit = async (values: CallFormValues) => {
        const payload: CallFollowupRequest = {
            type: 'call',
            body: values.body,
            veResponsibility: values.veResponsibility || null,
            contacts,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(sourceHistoryPath(source));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();

                const seeded = seedContactsFromSource(sourceRecord);
                if (seeded.length > 0) {
                    setContacts(seeded);
                    setLockedCount(seeded.length);
                }
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(sourceHistoryPath(source));
    };

    return {
        form,
        contacts,
        setContacts,
        lockedCount,
        isEditMode,
        saving: createFollowup.isPending || updateFollowup.isPending,
        handleSubmit,
        handleCancelEdit,
    };
};

// ─── Mail Form Hook ───────────────────────────────────────────────────────────
// ── UNCHANGED ────────────────────────────────────────────────────────────────

export const useMailForm = (source: FollowupSource) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(source);
    const updateFollowup = useUpdateFollowup(source);
    const { data: allFollowups = [] } = useFollowups(source);

    const existingFollowup = isEditMode
        ? allFollowups.find(f => f.id === followupId) ?? null
        : null;

    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]);

    const form = useForm<MailFormValues>({
        resolver: zodResolver(MailSchema),
        defaultValues: {
            body: "",
            frequency: "daily",
            nextFollowupDate: "",
        },
    });

    useEffect(() => {
        if (isEditMode && existingFollowup) {
            form.reset({
                body: existingFollowup.body || "",
                frequency: existingFollowup.frequency || "daily",
                nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
            });
            setAttachmentPaths(existingFollowup.attachments || []);
        }
    }, [existingFollowup, isEditMode, form]);

    const handleSubmit = async (values: MailFormValues) => {
        const payload: MailFollowupRequest = {
            type: "mail",
            body: values.body,
            frequency: values.frequency,
            attachments: attachmentPaths,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(sourceHistoryPath(source));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();
                setAttachmentPaths([]);
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(sourceHistoryPath(source));
    };

    return {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving: createFollowup.isPending || updateFollowup.isPending,
        handleSubmit,
        handleCancelEdit,
    };
};

// ─── WhatsApp Form Hook ───────────────────────────────────────────────────────
// ── UNCHANGED ────────────────────────────────────────────────────────────────

export const useWhatsappForm = (source: FollowupSource) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(source);
    const updateFollowup = useUpdateFollowup(source);
    const { data: allFollowups = [] } = useFollowups(source);

    const existingFollowup = isEditMode
        ? allFollowups.find(f => f.id === followupId) ?? null
        : null;

    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]);

    const form = useForm<WhatsappFormValues>({
        resolver: zodResolver(WhatsappSchema),
        defaultValues: {
            body: "",
            nextFollowupDate: "",
        },
    });

    useEffect(() => {
        if (isEditMode && existingFollowup) {
            form.reset({
                body: existingFollowup.body || "",
                nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
            });
            setAttachmentPaths(existingFollowup.attachments || []);
        }
    }, [existingFollowup, isEditMode, form]);

    const handleSubmit = async (values: WhatsappFormValues) => {
        const payload: WhatsappFollowupRequest = {
            type: 'whatsapp',
            body: values.body,
            attachments: attachmentPaths,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(sourceHistoryPath(source));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();
                setAttachmentPaths([]);
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(sourceHistoryPath(source));
    };

    return {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving: createFollowup.isPending || updateFollowup.isPending,
        handleSubmit,
        handleCancelEdit,
    };
};

// ─── Letter Form Hook ─────────────────────────────────────────────────────────
// ── CHANGED: useEffect block updated to read from existingFollowup.courier ───

export const useLetterForm = (source: FollowupSource) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(source);
    const updateFollowup = useUpdateFollowup(source);
    const { data: allFollowups = [] } = useFollowups(source);

    const existingFollowup = isEditMode
        ? allFollowups.find(f => f.id === followupId) ?? null
        : null;

    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]);

    const form = useForm<LetterFormValues>({
        resolver: zodResolver(LetterSchema),
        defaultValues: {
            toOrg: "", toName: "", toAddr: "", toPin: "",
            toMobile: "", empFrom: "", delDate: "",
            urgency: "", nextFollowupDate: "",
        },
    });

    // ── CHANGED ───────────────────────────────────────────────────────
    useEffect(() => {
        if (isEditMode && existingFollowup) {
            // The API now returns a nested `courier` object for letter type.
            // All letter-specific fields live inside it.
            const courierData = existingFollowup.courier;

            if (courierData) {
                form.reset({
                    // These fields come directly from the courier record
                    toOrg:    courierData.toOrg    || "",
                    toName:   courierData.toName   || "",
                    toAddr:   courierData.toAddr   || "",
                    toPin:    courierData.toPin    || "",
                    toMobile: courierData.toMobile || "",
                    // empFrom and urgency are integers in the DB but the
                    // form schema expects strings (for <select> elements)
                    empFrom:  courierData.empFrom  ? String(courierData.empFrom)  : "",
                    urgency:  courierData.urgency  ? String(courierData.urgency)  : "",
                    // delDate is a timestamp from the DB, format it for
                    // <input type="date"> which needs "YYYY-MM-DD"
                    delDate:  formatDateForInput(courierData.delDate),
                    // nextFollowupDate lives on the main followup record, not courier
                    nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
                });

                // Attachments are stored as `courierDocs` in the couriers table.
                // Your create/update service maps `attachments` → `courierDocs`.
                setAttachmentPaths(courierData.courierDocs || []);
            }
        }
    }, [existingFollowup, isEditMode, form]);
    // ── END CHANGED ───────────────────────────────────────────────────

    const handleSubmit = async (values: LetterFormValues) => {
        const payload: LetterFollowupRequest = {
            type: 'letter',
            toOrg:    values.toOrg,
            toName:   values.toName,
            toAddr:   values.toAddr,
            toPin:    values.toPin,
            toMobile: values.toMobile,
            // Convert strings back to numbers for the API/DTO
            empFrom:  Number(values.empFrom),
            delDate:  values.delDate,
            urgency:  Number(values.urgency),
            attachments: attachmentPaths,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(sourceHistoryPath(source));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();
                setAttachmentPaths([]);
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(sourceHistoryPath(source));
    };

    return {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving: createFollowup.isPending || updateFollowup.isPending,
        handleSubmit,
        handleCancelEdit,
    };
};