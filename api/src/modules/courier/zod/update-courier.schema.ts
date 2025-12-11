import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CreateCourierSchema } from "./create-courier.schema";

export const UpdateCourierSchema = CreateCourierSchema.partial();

export class UpdateCourierDto extends createZodDto(UpdateCourierSchema) {}
export type UpdateCourierInput = z.infer<typeof UpdateCourierSchema>;
