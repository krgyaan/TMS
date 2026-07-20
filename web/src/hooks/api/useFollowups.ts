import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { followupsService } from '@/services/api/followups.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import { useLead } from './useLeads';
import { paths } from '@/app/routes/paths';
import type { 
    CreateFollowupRequest, 
    ContactPerson, 
    VisitFollowupRequest, 
    CallFollowupRequest,
    MailFollowupRequest,
    WhatsappFollowupRequest,
    LetterFollowupRequest
} from '@/modules/crm/followups/helpers/followup.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const followupsKey = {
    all: ['followups'] as const,
    byLead: (leadId: number) => [...followupsKey.all, 'lead', leadId] as const,
    detail: (leadId: number, id: number) => [...followupsKey.byLead(leadId), id] as const,
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

export const useFollowups = (leadId: number) => {
    return useQuery({
        queryKey: followupsKey.byLead(leadId),
        queryFn: () => followupsService.getAll(leadId),
        enabled: !!leadId,
    });
};

export const useFollowup = (leadId: number, followupId: number) => {
    return useQuery({
        queryKey: followupsKey.detail(leadId, followupId),
        queryFn: () => followupsService.getById(leadId, followupId),
        enabled: !!leadId && !!followupId,
    });
};

export const useCreateFollowup = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateFollowupRequest) =>
            followupsService.create(leadId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupsKey.byLead(leadId) });
            queryClient.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
            toast.success('Follow-up saved successfully');
        },
        onError: showErrorToast,
    });
};

export const useUpdateFollowup = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ followupId, data }: { followupId: number; data: CreateFollowupRequest }) =>
            followupsService.update(leadId, followupId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupsKey.byLead(leadId) });
            queryClient.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
            toast.success('Follow-up updated successfully');
        },
        onError: showErrorToast,
    });
};

export const useDeleteFollowup = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (followupId: number) =>
            followupsService.remove(leadId, followupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupsKey.byLead(leadId) });
            queryClient.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
            toast.success('Follow-up deleted successfully');
        },
        onError: showErrorToast,
    });
};

// ─── Visit Form Hook ──────────────────────────────────────────────────────────

export const useVisitForm = (leadId: number) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(leadId);
    const updateFollowup = useUpdateFollowup(leadId);
    const { data: lead } = useLead(leadId);
    const { data: allFollowups = [] } = useFollowups(leadId);

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

        if (lead) {
            const leadData = lead as any;
            if (
                leadData.leadContacts &&
                Array.isArray(leadData.leadContacts) &&
                leadData.leadContacts.length > 0
            ) {
                const existingContacts = leadData.leadContacts.map((contact: any) => ({
                    name: contact.name || "",
                    designation: contact.designation || "",
                    phone: contact.phone || "",
                    email: contact.email || "",
                }));
                setContacts(existingContacts);
                setLockedCount(existingContacts.length);
            } else if (lead.name || lead.designation || lead.phone || lead.email) {
                setContacts([{
                    name: lead.name || "",
                    designation: lead.designation || "",
                    phone: lead.phone || "",
                    email: lead.email || "",
                }]);
                setLockedCount(1);
            }
        }
    }, [lead, isEditMode]);

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
                navigate(paths.crm.leadFollowupHistory(leadId));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();
                
                if (lead) {
                    const leadData = lead as any;
                    if (
                        leadData.leadContacts &&
                        Array.isArray(leadData.leadContacts) &&
                        leadData.leadContacts.length > 0
                    ) {
                        const existingContacts = leadData.leadContacts.map((c: any) => ({
                            name: c.name || "",
                            designation: c.designation || "",
                            phone: c.phone || "",
                            email: c.email || "",
                        }));
                        setContacts(existingContacts);
                        setLockedCount(existingContacts.length);
                    } else if (lead.name || lead.designation || lead.phone || lead.email) {
                        setContacts([{
                            name: lead.name || "",
                            designation: lead.designation || "",
                            phone: lead.phone || "",
                            email: lead.email || "",
                        }]);
                        setLockedCount(1);
                    }
                }
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(paths.crm.leadFollowupHistory(leadId));
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

export const useCallForm = (leadId: number) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(leadId);
    const updateFollowup = useUpdateFollowup(leadId);
    const { data: lead } = useLead(leadId);
    const { data: allFollowups = [] } = useFollowups(leadId);

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

        if (lead) {
            const leadData = lead as any;
            if (
                leadData.leadContacts &&
                Array.isArray(leadData.leadContacts) &&
                leadData.leadContacts.length > 0
            ) {
                const existingContacts = leadData.leadContacts.map((contact: any) => ({
                    name: contact.name || "",
                    designation: contact.designation || "",
                    phone: contact.phone || "",
                    email: contact.email || "",
                }));
                setContacts(existingContacts);
                setLockedCount(existingContacts.length);
            } else if (lead.name || lead.designation || lead.phone || lead.email) {
                setContacts([{
                    name: lead.name || "",
                    designation: lead.designation || "",
                    phone: lead.phone || "",
                    email: lead.email || "",
                }]);
                setLockedCount(1);
            }
        }
    }, [lead, isEditMode]);

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
                navigate(paths.crm.leadFollowupHistory(leadId));
            } else {
                await createFollowup.mutateAsync(payload);
                form.reset();
                
                if (lead) {
                    const leadData = lead as any;
                    if (
                        leadData.leadContacts &&
                        Array.isArray(leadData.leadContacts) &&
                        leadData.leadContacts.length > 0
                    ) {
                        const existingContacts = leadData.leadContacts.map((c: any) => ({
                            name: c.name || "",
                            designation: c.designation || "",
                            phone: c.phone || "",
                            email: c.email || "",
                        }));
                        setContacts(existingContacts);
                        setLockedCount(existingContacts.length);
                    } else if (lead.name || lead.designation || lead.phone || lead.email) {
                        setContacts([{
                            name: lead.name || "",
                            designation: lead.designation || "",
                            phone: lead.phone || "",
                            email: lead.email || "",
                        }]);
                        setLockedCount(1);
                    }
                }
            }
        } catch {
            // handled by hook
        }
    };

    const handleCancelEdit = () => {
        navigate(paths.crm.leadFollowupHistory(leadId));
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

export const useMailForm = (leadId: number) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(leadId);
    const updateFollowup = useUpdateFollowup(leadId);
    const { data: allFollowups = [] } = useFollowups(leadId);

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
                frequency: (existingFollowup.frequency as any) || "daily",
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
                navigate(paths.crm.leadFollowupHistory(leadId));
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
        navigate(paths.crm.leadFollowupHistory(leadId));
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

export const useWhatsappForm = (leadId: number) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(leadId);
    const updateFollowup = useUpdateFollowup(leadId);
    const { data: allFollowups = [] } = useFollowups(leadId);

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
                navigate(paths.crm.leadFollowupHistory(leadId));
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
        navigate(paths.crm.leadFollowupHistory(leadId));
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

export const useLetterForm = (leadId: number) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const followupIdParam = searchParams.get("followupId");
    const followupId = followupIdParam ? Number(followupIdParam) : null;
    const isEditMode = !!followupId;

    const createFollowup = useCreateFollowup(leadId);
    const updateFollowup = useUpdateFollowup(leadId);
    const { data: allFollowups = [] } = useFollowups(leadId);

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

    useEffect(() => {
        if (isEditMode && existingFollowup) {
            // Letter followup data comes from courier table, we need to handle this differently
            form.reset({
                toOrg: "",
                toName: "",
                toAddr: "",
                toPin: "",
                toMobile: "",
                empFrom: "",
                delDate: "",
                urgency: "",
                nextFollowupDate: formatDateForInput(existingFollowup.nextFollowupDate),
            });
            setAttachmentPaths(existingFollowup.attachments || []);
        }
    }, [existingFollowup, isEditMode, form]);

    const handleSubmit = async (values: LetterFormValues) => {
        const payload: LetterFollowupRequest = {
            type: 'letter',
            toOrg: values.toOrg,
            toName: values.toName,
            toAddr: values.toAddr,
            toPin: values.toPin,
            toMobile: values.toMobile,
            empFrom: Number(values.empFrom),
            delDate: values.delDate,
            urgency: Number(values.urgency),
            attachments: attachmentPaths,
            nextFollowupDate: values.nextFollowupDate || null,
        };

        try {
            if (isEditMode && followupId) {
                await updateFollowup.mutateAsync({
                    followupId,
                    data: payload,
                });
                navigate(paths.crm.leadFollowupHistory(leadId));
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
        navigate(paths.crm.leadFollowupHistory(leadId));
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