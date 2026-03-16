import type { WoBasicDetailFormValues } from "./basiDetail.types";
import type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto } from "@/modules/operations/types/wo.types";

export const buildDefaultValues = (): WoBasicDetailFormValues => ({
  tenderId: null,
  woNumber: 0,
  woDate: null,
  woValuePreGst: 0,
  woValueGstAmt: 0,
  budgetPreGst: 0,
  receiptPreGst: 0,
  grossMargin: 0,
  projectCode: "",
  projectName: "",
  wo_draft: [],
});

export const mapResponseToForm = (data: WoBasicDetail): WoBasicDetailFormValues => {
  return {
    tenderId: data.tenderId,
    woNumber: Number(data.woNumber) || 0,
    woDate: data.woDate ? new Date(data.woDate) : null,

    woValuePreGst: Number(data.woValuePreGst) || 0,
    woValueGstAmt: Number(data.woValueGstAmt) || 0,
    budgetPreGst: Number(data.budgetPreGst) || 0,
    receiptPreGst: Number(data.receiptPreGst) || 0,
    grossMargin: Number(data.grossMargin) || 0,
    projectCode: data.projectCode || "",
    projectName: data.projectName || "",
    wo_draft: data.wo_draft ? JSON.parse(data.wo_draft) : [],
  };
};

export const mapFormToCreatePayload = (values: WoBasicDetailFormValues): CreateWoBasicDetailDto => {
  const payload: CreateWoBasicDetailDto = {
    woNumber: String(values.woNumber),
    woDate: values.woDate ? values.woDate.toISOString() : undefined,
    projectCode: values.projectCode || "",
    projectName: values.projectName || "",
    currentStage: "basic_details",
  };

  if (values.tenderId) payload.tenderId = values.tenderId;
  if (values.woValuePreGst !== undefined) payload.woValuePreGst = String(values.woValuePreGst);
  if (values.woValueGstAmt !== undefined) payload.woValueGstAmt = String(values.woValueGstAmt);
  if (values.budgetPreGst !== undefined) payload.budgetPreGst = String(values.budgetPreGst);
  if (values.receiptPreGst !== undefined) payload.receiptPreGst = String(values.receiptPreGst);
  if (values.grossMargin !== undefined) payload.grossMargin = String(values.grossMargin);
  if (values.wo_draft && values.wo_draft.length > 0) payload.wo_draft = JSON.stringify(values.wo_draft);

  return payload;
};

export const mapFormToUpdatePayload = (values: WoBasicDetailFormValues): UpdateWoBasicDetailDto => {
  const payload: UpdateWoBasicDetailDto = {
    woNumber: String(values.woNumber),
    woDate: values.woDate ? values.woDate.toISOString() : undefined,
    projectCode: values.projectCode || "",
    projectName: values.projectName || "",
  };

  if (values.woValuePreGst !== undefined) payload.woValuePreGst = String(values.woValuePreGst);
  if (values.woValueGstAmt !== undefined) payload.woValueGstAmt = String(values.woValueGstAmt);
  if (values.budgetPreGst !== undefined) payload.budgetPreGst = String(values.budgetPreGst);
  if (values.receiptPreGst !== undefined) payload.receiptPreGst = String(values.receiptPreGst);
  if (values.grossMargin !== undefined) payload.grossMargin = String(values.grossMargin);
  if (values.wo_draft && values.wo_draft.length > 0) payload.wo_draft = JSON.stringify(values.wo_draft);

  return payload;
};
