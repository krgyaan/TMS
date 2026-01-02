import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    bigintField,
    textField,
} from '@/utils/zod-schema-generator';

/**
 * Physical Doc Person Schema - Based on physicalDocsPersons table
 */
export const PhysicalDocPersonSchema = z.object({
    name: textField(255).min(1, 'Name is required'),
    email: z.string().email('Invalid email').max(255, 'Email must be 255 characters or less'),
    phone: textField(255).min(1, 'Phone is required'),
});

export type PhysicalDocPersonDto = z.infer<typeof PhysicalDocPersonSchema>;

/**
 * Create Physical Doc Schema - Based on physicalDocs + physicalDocsPersons tables
 */
export const CreatePhysicalDocSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    courierNo: z.coerce.number().int().positive('Courier number must be positive'),
    submittedDocs: optionalTextField(2000),
    physicalDocsPersons: z.array(PhysicalDocPersonSchema).optional(),
});

export type CreatePhysicalDocDto = z.infer<typeof CreatePhysicalDocSchema>;

/**
 * Update Physical Doc Schema - Partial update
 */
export const UpdatePhysicalDocSchema = z.object({
    courierNo: z.coerce.number().int().positive('Courier number must be positive').optional(),
    submittedDocs: optionalTextField(2000),
    physicalDocsPersons: z.array(PhysicalDocPersonSchema).optional(),
});

export type UpdatePhysicalDocDto = z.infer<typeof UpdatePhysicalDocSchema>;
