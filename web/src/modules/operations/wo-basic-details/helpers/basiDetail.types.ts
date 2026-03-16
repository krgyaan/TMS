import { z } from "zod";
import { WoBasicDetailFormSchema } from "./basiDetail.schema";
import type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto } from "@/modules/operations/types/wo.types";

export type WoBasicDetailFormValues = z.infer<typeof WoBasicDetailFormSchema>;

export type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto };
