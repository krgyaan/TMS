import type {
    ContactPerson,
    CreateFollowUpDto,
    FollowUpDetails,
    UpdateFollowUpPayload,
    UpdateFollowUpStatusPayload,
} from "./followUp.types";
import type {
    FollowUpCreateFormValues,
    FollowUpEditFormValues,
    FollowUpStatusFormValues,
} from "./followUp.schema";

const toNullable = (value?: string | null): string | null => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
};

const mapContacts = (contacts: FollowUpCreateFormValues["contacts"]): ContactPerson[] =>
    contacts.map(contact => ({
        id: contact.id,
        name: toNullable(contact.name) ?? "",
        designation: contact.designation ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        org: contact.org ?? null,
    }));

export const buildCreateDefaults = (): FollowUpCreateFormValues => ({
    area: "",
    partyName: "",
    assignedToId: 0,
    amount: "",
    followupFor: "",
    comment: "",
    contacts: [{ name: "", email: "", phone: "" }],
});

export const buildStatusDefaults = (): FollowUpStatusFormValues => ({
    frequency: 1,
    nextFollowUpDate: "",
    latestComment: "",
    stopReason: null,
    proofText: "",
    stopRemarks: "",
    proofImage: "",
});

export const mapDetailsToEditForm = (details: FollowUpDetails): FollowUpEditFormValues => ({
    area: details.area,
    partyName: details.partyName,
    assignedToId: details.assignedToId ?? undefined,
    amount: details.amount != null ? String(details.amount) : "",
    followupFor: details.followupFor ?? "",
    details: details.details ?? "",
    frequency: details.frequency ?? undefined,
    startFrom: details.startFrom ?? "",
    stopReason: details.stopReason ?? null,
    proofText: details.proofText ?? "",
    stopRemarks: details.stopRemarks ?? "",
    proofImage: details.proofImagePath ?? "",
    contacts: (details.contacts ?? []).map(contact => ({
        id: contact.id,
        name: contact.name ?? "",
        designation: contact.designation ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        org: contact.org ?? null,
    })),
});

export const mapCreateFormToPayload = (values: FollowUpCreateFormValues): CreateFollowUpDto => ({
    area: values.area,
    partyName: values.partyName,
    amount: values.amount ? Number(values.amount) : undefined,
    followupFor: values.followupFor,
    assignedToId: values.assignedToId,
    comment: values.comment || null,
    contacts: mapContacts(values.contacts),
});

export const mapEditFormToPayload = (
    values: FollowUpEditFormValues,
    newAttachments: string[],
    removedAttachments: string[]
): UpdateFollowUpPayload => {
    const payload: UpdateFollowUpPayload = {
        area: values.area,
        partyName: values.partyName,
        amount: values.amount !== undefined && values.amount !== "" ? Number(values.amount) : undefined,
        followupFor: values.followupFor || null,
        assignedToId: values.assignedToId,
        details: values.details ?? null,
        contacts: mapContacts(values.contacts),
        frequency: values.frequency,
        startFrom: values.startFrom || undefined,
        attachments: newAttachments,
        removedAttachments,
    };

    if (values.frequency === 6) {
        payload.stopReason = values.stopReason ?? null;
        payload.proofText = values.proofText ?? null;
        payload.stopRemarks = values.stopRemarks ?? null;
        if (values.stopReason === 2 && values.proofImage) {
            payload.proofImage = values.proofImage;
        }
    } else {
        payload.stopReason = null;
        payload.proofText = null;
        payload.stopRemarks = null;
    }

    return payload;
};

export const mapStatusFormToPayload = (values: FollowUpStatusFormValues): UpdateFollowUpStatusPayload => {
    const payload: UpdateFollowUpStatusPayload = {
        latestComment: values.latestComment ?? "",
        frequency: values.frequency,
    };

    if (values.frequency === 6) {
        payload.stopReason = values.stopReason ?? null;
        payload.proofText = values.proofText ?? null;
        payload.stopRemarks = values.stopRemarks ?? null;
        if (values.stopReason === 2 && values.proofImage) {
            payload.proofImage = values.proofImage;
        }
    } else if (values.nextFollowUpDate) {
        payload.nextFollowUpDate = values.nextFollowUpDate;
    }

    return payload;
};

export const getRemovedAttachments = (existingData: FollowUpDetails, remainingAttachments: string[]): string[] =>
    (existingData.attachments ?? []).filter(attachment => !remainingAttachments.includes(attachment));
