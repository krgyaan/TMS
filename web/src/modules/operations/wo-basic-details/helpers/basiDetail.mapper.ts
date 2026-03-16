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
    woNumber: data.woNumber,
    // Expect WO Date to be correctly parsed and formatted
    woDate: data.woDate ? new Date(data.woDate) : null,

    woValuePreGst: data.woValuePreGst || "",
    woValueGstAmt: data.woValueGstAmt || "",
    budgetPreGst: data.budgetPreGst || "",
    receiptPreGst: data.receiptPreGst || "",
    grossMargin: data.grossMargin || "",
    projectCode: data.projectCode || "",
    projectName: data.projectName || "",
    wo_draft: data.wo_draft ? JSON.parse(data.wo_draft) : [],
  };
};

export const mapFormToCreatePayload = (values: WoBasicDetailFormValues): CreateWoBasicDetailDto => {
  const payload: CreateWoBasicDetailDto = {
    woNumber: values.woNumber,
    woDate: values.woDate, // Assume backend expects appropriate string format
    projectCode: values.projectCode,
    projectName: values.projectName,
    currentStage: "basic_details",
  };

  if (values.tenderId) payload.tenderId = values.tenderId;
  if (values.woValuePreGst) payload.woValuePreGst = values.woValuePreGst;
  if (values.woValueGstAmt) payload.woValueGstAmt = values.woValueGstAmt;
  if (values.budgetPreGst) payload.budgetPreGst = values.budgetPreGst;
  if (values.receiptPreGst) payload.receiptPreGst = values.receiptPreGst;
  if (values.grossMargin) payload.grossMargin = values.grossMargin;
  if (values.wo_draft && values.wo_draft.length > 0) payload.wo_draft = JSON.stringify(values.wo_draft);

  return payload;
};

export const mapFormToUpdatePayload = (values: WoBasicDetailFormValues): UpdateWoBasicDetailDto => {
  const payload: UpdateWoBasicDetailDto = {
    woNumber: values.woNumber,
    woDate: values.woDate,
    projectCode: values.projectCode,
    projectName: values.projectName,
  };

  if (values.woValuePreGst) payload.woValuePreGst = values.woValuePreGst;
  if (values.woValueGstAmt) payload.woValueGstAmt = values.woValueGstAmt;
  if (values.budgetPreGst) payload.budgetPreGst = values.budgetPreGst;
  if (values.receiptPreGst) payload.receiptPreGst = values.receiptPreGst;
  if (values.grossMargin) payload.grossMargin = values.grossMargin;
  if (values.wo_draft && values.wo_draft.length > 0) payload.wo_draft = JSON.stringify(values.wo_draft);

  return payload;
};
