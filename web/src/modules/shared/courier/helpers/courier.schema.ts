import { z } from "zod";
import { COURIER_STATUS } from "./courier.constants";

export const CourierFormSchema = z.object({
    toOrg: z.string().min(1, "Organization name is required"),
    toName: z.string().min(1, "Recipient name is required"),
    toAddr: z.string().min(1, "Address is required"),
    toPin: z
        .string()
        .min(1, "Pin code is required")
        .regex(/^\d{6}$/, "Pin code must be 6 digits"),
    toMobile: z
        .string()
        .min(1, "Mobile number is required")
        .regex(/^\d{10}$/, "Mobile number must be 10 digits"),
    empFrom: z.coerce.number({ required_error: "Please select an employee" }).int().positive(),
    delDate: z.string().min(1, "Expected delivery date is required"),
    urgency: z.coerce.number({ required_error: "Please select dispatch urgency" }).int().min(1).max(2),
});

export type CourierFormValues = z.infer<typeof CourierFormSchema>;

export const CourierDispatchSchema = z.object({
    courierProvider: z.string().min(1, "Courier provider is required"),
    pickupDate: z.string().min(1, "Pickup date and time is required"),
    docketNo: z.string().min(1, "Docket number is required"),
});

export type CourierDispatchFormValues = z.infer<typeof CourierDispatchSchema>;

export const CourierStatusSchema = z
    .object({
        status: z.coerce.number().int(),
        deliveryDate: z.string().optional(),
        withinTime: z.enum(["1", "0"]).optional(),
        pod: z.array(z.string()).optional(),
    })
    .superRefine((value, ctx) => {
        if (value.status !== COURIER_STATUS.DELIVERED) return;

        if (!value.deliveryDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Delivery date & time is required",
                path: ["deliveryDate"],
            });
        }

        if (!value.withinTime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please select whether delivery was within expected time",
                path: ["withinTime"],
            });
        }

        if (!value.pod || value.pod.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Proof of delivery is required",
                path: ["pod"],
            });
        }
    });

export type CourierStatusFormValues = z.infer<typeof CourierStatusSchema>;
