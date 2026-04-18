import { z } from "zod";
import { WoBasicDetailFormSchema, AssignOeFormSchema } from "./basiDetail.schema";
import type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto, WorkflowStage, AssignOeDto } from "@/modules/operations/types/wo.types";

export type WoBasicDetailFormValues = z.infer<typeof WoBasicDetailFormSchema>;
export type AssignOeFormValues = z.infer<typeof AssignOeFormSchema>;

export type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto, WorkflowStage, AssignOeDto };
