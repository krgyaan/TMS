import { z } from 'zod';

/**
 * Utility functions to generate Zod schemas from Drizzle schema definitions
 * These helpers ensure consistency between database schemas and validation schemas
 */

/**
 * Transform empty strings to null for optional fields
 */
export const optionalString = z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
        if (v === null || v === undefined) return null;
        const trimmed = String(v).trim();
        return trimmed.length > 0 ? trimmed : null;
    });

/**
 * Helper for optional numbers with coercion
 */
export const optionalNumber = (schema: z.ZodNumber = z.coerce.number()) =>
    z
        .union([schema, z.undefined(), z.null(), z.literal('')])
        .transform((v) => {
            if (v === null || v === undefined || v === '') return null;
            const num = typeof v === 'number' ? v : Number(v);
            return Number.isNaN(num) ? null : num;
        });

/**
 * Helper for optional arrays
 */
export const optionalStringArray = z
    .union([z.array(z.string()), z.undefined(), z.null()])
    .transform((v) => {
        if (!v || !Array.isArray(v) || v.length === 0) return null;
        return v.filter((item) => item && String(item).trim().length > 0);
    });

/**
 * Helper for decimal fields (stored as strings in DB, validated as numbers)
 */
export const decimalField = (min?: number, max?: number) => {
    let schema = z.coerce.number();
    if (min !== undefined) schema = schema.min(min);
    if (max !== undefined) schema = schema.max(max);
    return z
        .union([schema, z.string(), z.undefined(), z.null(), z.literal('')])
        .transform((v) => {
            if (v === null || v === undefined || v === '') return null;
            if (typeof v === 'number') return v;
            const num = Number(v);
            return Number.isNaN(num) ? null : num;
        });
};

/**
 * Helper for date/timestamp fields
 */
export const dateField = z
    .union([z.string(), z.date(), z.undefined(), z.null()])
    .transform((v) => {
        if (!v) return null;
        if (v instanceof Date) return v;
        const date = new Date(v);
        return isNaN(date.getTime()) ? null : date;
    })
    .optional()
    .nullable();

/**
 * Helper for required date fields
 */
export const requiredDateField = z
    .union([z.string(), z.date()])
    .transform((v) => {
        if (v instanceof Date) return v;
        const date = new Date(v);
        if (isNaN(date.getTime())) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.invalid_date,
                    path: [],
                    message: 'Invalid date format',
                },
            ]);
        }
        return date;
    });

/**
 * Helper for enum fields
 */
export const enumField = <T extends [string, ...string[]]>(values: T) =>
    z.enum(values).optional().nullable();

/**
 * Helper for required enum fields
 */
export const requiredEnumField = <T extends [string, ...string[]]>(values: T) =>
    z.enum(values);

/**
 * Helper for bigint fields (coerced to number)
 */
export const bigintField = (min?: number) => {
    let schema = z.coerce.number().int();
    if (min !== undefined) schema = schema.min(min);
    return schema;
};

/**
 * Helper for optional bigint fields
 */
export const optionalBigintField = (min?: number) => {
    let schema = z.coerce.number().int();
    if (min !== undefined) schema = schema.min(min);
    return z.union([schema, z.undefined(), z.null()]).transform((v) => {
        if (v === null || v === undefined) return null;
        return Number(v);
    });
};

/**
 * Helper for text fields with max length
 */
export const textField = (maxLength?: number) => {
    let schema = z.string();
    if (maxLength !== undefined) schema = schema.max(maxLength);
    return schema;
};

/**
 * Helper for optional text fields
 */
export const optionalTextField = (maxLength?: number) => {
    let schema = optionalString;
    if (maxLength !== undefined) {
        schema = z
            .union([z.string().max(maxLength), z.undefined(), z.null()])
            .transform((v) => {
                if (v === null || v === undefined) return null;
                const trimmed = String(v).trim();
                return trimmed.length > 0 ? trimmed : null;
            });
    }
    return schema;
};

/**
 * Helper for JSONB fields
 */
export const jsonbField = <T extends z.ZodTypeAny>(schema?: T) => {
    if (schema) {
        return z.union([schema, z.undefined(), z.null()]);
    }
    return z.union([z.any(), z.undefined(), z.null()]);
};

/**
 * Helper for boolean fields with default
 */
export const booleanField = (defaultValue: boolean = false) =>
    z.boolean().optional().default(defaultValue);
