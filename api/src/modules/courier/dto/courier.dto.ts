import { z } from "zod";

/**
 * Create courier payload
 */
export const CreateCourierSchema = z.object({
    toOrg: z.string().min(1, "Organization name is required").max(255),
    toName: z.string().min(1, "Recipient name is required").max(255),
    toAddr: z.string().min(1, "Address is required"),
    toPin: z.string().min(1, "Pin code is required").max(255),
    toMobile: z.string().min(1, "Mobile number is required").max(255),

    empFrom: z.coerce.number().int().positive("Please select an employee"),

    delDate: z.coerce.date(),

    urgency: z.coerce.number().int().min(1).max(2),

    courierDocs: z.array(z.string()).optional().default([]),
});

export type CreateCourierDto = z.infer<typeof CreateCourierSchema>;
export type CreateCourierInput = z.infer<typeof CreateCourierSchema>;

/**
 * Update courier payload
 */
export const UpdateCourierSchema = CreateCourierSchema.partial();

export type UpdateCourierInput = z.infer<typeof UpdateCourierSchema>;

/**
 * Dispatch courier payload
 */
export const CreateDispatchSchema = z.object({
    courierProvider: z.string().min(1, "Courier provider is required").max(255).transform(v => v.trim()),
    docketNo: z.string().min(1, "Docket number is required").max(255).transform(v => v.trim()),
    pickupDate: z.coerce.date(),
    docketSlip: z.string().optional(),
});

export type CreateDispatchInput = z.infer<typeof CreateDispatchSchema>;
export type DispatchCourierDto = z.infer<typeof CreateDispatchSchema>;

/**
 * Update courier status payload.
 * Accepts both camelCase (new) and snake_case (legacy) field names.
 */
export const UpdateCourierStatusSchema = z
    .object({
        status: z.coerce.number().int(),

        deliveryDate: z.coerce.date().optional(),
        withinTime: z.boolean().optional(),
        podDoc: z.string().optional(),

        // Legacy aliases
        delivery_date: z.coerce.date().optional(),
        within_time: z.coerce.boolean().optional(),
    })
    .transform(value => ({
        status: value.status,
        deliveryDate: value.deliveryDate ?? value.delivery_date,
        withinTime: value.withinTime ?? value.within_time,
        podDoc: value.podDoc,
    }));

export type UpdateCourierStatusInput = z.infer<typeof UpdateCourierStatusSchema>;

/**
 * Dashboard query params
 */
export const CourierDashboardQuerySchema = z.object({
    tab: z.enum(["pending", "dispatched", "not_delivered", "delivered", "rejected"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    search: z.string().optional(),
    teamId: z.coerce.number().int().optional(),
    userId: z.coerce.number().int().optional(),
});

export type CourierDashboardQuery = z.infer<typeof CourierDashboardQuerySchema>;
export type CourierTab = NonNullable<CourierDashboardQuery["tab"]>;
