import { z } from "zod";

export interface ServiceFeedbackAttachment {
    path: string;
    name?: string;
    type?: string;
}

export interface ServiceFeedback {
    id: number;
    complaintId: number;
    problemResolved: "0" | "1";
    satisfaction: number | null;
    suggestions: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceFeedbackListItem {
    feedbackId: number | null;
    complaintId: number;
    ticketNo: string | null;
    siteProjectName: string | null;
    customerName: string | null;
    organization: string | null;
    siteLocation: string | null;
    complaintStatus: string | null;
    serviceEngineerName: string | null;
    engineerAllottedAt: string | null;
    problemResolved: string | null;
    satisfaction: number | null;
    suggestions: string | null;
    feedbackCreatedAt: string;
}

export interface ServiceFeedbackListItemWithFeedback extends ServiceFeedbackListItem {
    hasFeedback: boolean;
}

export interface CreateServiceFeedbackDto {
    complaintId: number;
    problemResolved: "0" | "1";
    satisfaction: number | null;
    suggestions?: string | null;
}

export type UpdateServiceFeedbackDto = Partial<CreateServiceFeedbackDto>;

export const ServiceFeedbackFormSchema = z.object({
    problemResolved: z.enum(["0", "1"], {
        error: "Please select whether the problem was resolved",
    }),
    satisfaction: z.coerce
        .number()
        .int()
        .min(1, "Minimum rating is 1")
        .max(5, "Maximum rating is 5")
        .optional()
        .nullable(),
    suggestions: z.string().optional().nullable(),
});

export type ServiceFeedbackFormValues = z.infer<typeof ServiceFeedbackFormSchema>;

export const serviceFeedbackFormDefaultValues: ServiceFeedbackFormValues = {
    problemResolved: "0",
    satisfaction: null,
    suggestions: "",
};