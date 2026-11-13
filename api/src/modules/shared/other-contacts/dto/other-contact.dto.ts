import { z } from 'zod';

// Empty / missing strings are stored as NULL (same convention as tender clients).
const optionalString = z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
        if (v === null || v === undefined) return null;
        const trimmed = String(v).trim();
        return trimmed.length > 0 ? trimmed : null;
    });

export const CreateOtherContactSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255),
    designation: optionalString.optional(),
    email: z
        .union([z.string().email('Invalid email address').max(255), z.literal(''), z.null(), z.undefined()])
        .transform((v) => (v ? String(v).trim() : null)),
    phone: optionalString.optional(),
    purpose: optionalString.optional(),
});

export type CreateOtherContactDto = z.infer<typeof CreateOtherContactSchema>;
