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
    empFrom: z.coerce.number({ message: "Please select an employee" }).int().positive(),
    delDate: z.string().min(1, "Expected delivery date is required"),
    urgency: z.coerce.number({ message: "Please select dispatch urgency" }).int().min(1).max(2),

    // Editable-only fields (available in edit mode for privileged users)
    userId: z.coerce.number().int().positive().optional(),
    courierDocs: z.array(z.string()).optional(),
    status: z.coerce.number().int().min(0).max(5).optional(),
    trackingNumber: z.string().max(255).optional(),
    courierProvider: z.string().max(255).optional(),
    pickupDate: z.string().optional(),
    docketNo: z.string().max(255).optional(),
    docketSlip: z.array(z.string()).optional(),
    deliveryDate: z.string().optional(),
    deliveryPod: z.array(z.string()).optional(),
    withinTime: z.enum(["1", "0"]).optional(),
});

export type CourierFormValues = z.infer<typeof CourierFormSchema>;

export const CourierStatusSchema = z
    .object({
        status: z.coerce.number().int(),
        deliveryDate: z.string().optional(),
        withinTime: z.enum(["1", "0"]).optional(),
        pod: z.array(z.string()).optional(),

        // Dispatch fields (merged into the status form)
        courierProvider: z.string().optional(),
        pickupDate: z.string().optional(),
        docketNo: z.string().optional(),
        docketSlip: z.array(z.string()).optional(),
    })
    .superRefine((value, ctx) => {
        if (value.status === COURIER_STATUS.DISPATCHED) {
            if (!value.courierProvider?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Courier provider is required",
                    path: ["courierProvider"],
                });
            }

            if (!value.pickupDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Pickup date & time is required",
                    path: ["pickupDate"],
                });
            }

            if (!value.docketNo?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Docket number is required",
                    path: ["docketNo"],
                });
            }
        }

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
