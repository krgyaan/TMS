import { z } from 'zod';

export const DepartmentEnum = z.enum(['EIC', 'User', 'C&P', 'Finance']);

export const CreateWoContactSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  organization: z.string().max(100).optional(),
  departments: DepartmentEnum.optional(),
  name: z.string().max(255).optional(),
  designation: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
});

export type CreateWoContactDto = z.infer<typeof CreateWoContactSchema>;

export const UpdateWoContactSchema = z.object({
  organization: z.string().max(100).optional(),
  departments: DepartmentEnum.optional(),
  name: z.string().max(255).optional(),
  designation: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
});

export type UpdateWoContactDto = z.infer<typeof UpdateWoContactSchema>;

export const CreateBulkWoContactsSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  contacts: z.array(CreateWoContactSchema.omit({ woBasicDetailId: true })),
});

export type CreateBulkWoContactsDto = z.infer<typeof CreateBulkWoContactsSchema>;

export const WoContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  woBasicDetailId: z.coerce.number().int().positive().optional(),
  departments: DepartmentEnum.optional(),
  search: z.string().optional(),
});

export type WoContactsQueryDto = z.infer<typeof WoContactsQuerySchema>;
