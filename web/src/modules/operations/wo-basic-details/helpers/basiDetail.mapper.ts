import type { AssignOeFormValues, WoBasicDetailFormValues } from "./basiDetail.types";
import type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto, AssignOeDto } from "@/modules/operations/types/wo.types";

export const buildDefaultValues = (): WoBasicDetailFormValues => ({
  tenderId: null,
  woNumber: "",
  woDate: null,
  woValuePreGst: 0,
  woValueGstAmt: 0,
  budgetPreGst: 0,
  receiptPreGst: 0,
  grossMargin: 0,
  projectCode: "",
  projectName: "",
  woDraft: [],
  teChecklistConfirmed: false,
  tmsDocuments: {
    "Complete Tender Documents": false,
    "Tender Info": false,
    "EMD Information": false,
    "Physical documents submission": false,
    "RFQ and Quotation": false,
    "Document Checklist": false,
    "Costing Sheet": false,
    "TQ": false,
    "RA and Result details": false,
  },
});

const safeParseJsonArray = (val: string | null | undefined): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [String(val)];
  } catch (e) {
    // If it's not valid JSON, it's likely a legacy plain string path
    return [String(val)];
  }
};

export const mapResponseToForm = (data: WoBasicDetail): WoBasicDetailFormValues => {
  return {
    tenderId: data.tenderId,
    woNumber: String(data.woNumber || ""),
    woDate: data.woDate ? new Date(data.woDate) : null,

    woValuePreGst: Number(data.woValuePreGst) || 0,
    woValueGstAmt: Number(data.woValueGstAmt) || 0,
    budgetPreGst: Number(data.budgetPreGst) || 0,
    receiptPreGst: Number(data.receiptPreGst) || 0,
    grossMargin: Number(data.grossMargin) || 0,
    projectCode: data.projectCode || "",
    projectName: data.projectName || "",
    wo_draft: safeParseJsonArray(data.woDraft),
    tmsDocuments: data.tmsDocuments || {
      "Complete Tender Documents": false,
      "Tender Info": false,
      "EMD Information": false,
      "Physical documents submission": false,
      "RFQ and Quotation": false,
      "Document Checklist": false,
      "Costing Sheet": false,
      "TQ": false,
      "RA and Result details": false,
    },
  };
};

export const mapFormToCreatePayload = (values: WoBasicDetailFormValues): CreateWoBasicDetailDto => {
  const payload: CreateWoBasicDetailDto = {
    woNumber: String(values.woNumber),
    woDate: values.woDate ? values.woDate.toISOString().split('T')[0] : undefined,
    projectCode: values.projectCode || "",
    projectName: values.projectName || "",
    currentStage: "basic_details",
    tmsDocuments: values.tmsDocuments,
  };

  if (values.tenderId) payload.tenderId = values.tenderId;
  if (values.woValuePreGst !== undefined) payload.woValuePreGst = String(values.woValuePreGst);
  if (values.woValueGstAmt !== undefined) payload.woValueGstAmt = String(values.woValueGstAmt);
  if (values.budgetPreGst !== undefined) payload.budgetPreGst = String(values.budgetPreGst);
  if (values.receiptPreGst !== undefined) payload.receiptPreGst = String(values.receiptPreGst);
  if (values.grossMargin !== undefined) payload.grossMargin = String(values.grossMargin);
  if (values.woDraft && values.woDraft.length > 0) payload.woDraft = JSON.stringify(values.woDraft);

  return payload;
};

export const mapFormToUpdatePayload = (values: WoBasicDetailFormValues): UpdateWoBasicDetailDto => {
  const payload: UpdateWoBasicDetailDto = {
    woNumber: String(values.woNumber),
    woDate: values.woDate ? values.woDate.toISOString().split('T')[0] : undefined,
    projectCode: values.projectCode || "",
    projectName: values.projectName || "",
    tmsDocuments: values.tmsDocuments,
  };

  if (values.woValuePreGst !== undefined) payload.woValuePreGst = String(values.woValuePreGst);
  if (values.woValueGstAmt !== undefined) payload.woValueGstAmt = String(values.woValueGstAmt);
  if (values.budgetPreGst !== undefined) payload.budgetPreGst = String(values.budgetPreGst);
  if (values.receiptPreGst !== undefined) payload.receiptPreGst = String(values.receiptPreGst);
  if (values.grossMargin !== undefined) payload.grossMargin = String(values.grossMargin);
  if (values.woDraft && values.woDraft.length > 0) payload.woDraft = JSON.stringify(values.woDraft);

  return payload;
};

export const mapFormToAssignOePayload = (values: AssignOeFormValues): AssignOeDto => {
  return {
    woBasicDetailId: values.woBasicDetailId ?? null,
    oeFirst: values.oeFirst ?? null,
    oeFirstAssignedAt: values.oeFirstAssignedAt ?? null,
    oeFirstAssignedBy: values.oeFirstAssignedBy ?? null,
    oeSiteVisit: values.oeSiteVisit ?? null,
    oeSiteVisitAssignedAt: values.oeSiteVisitAssignedAt ?? null,
    oeSiteVisitAssignedBy: values.oeSiteVisitAssignedBy ?? null,
    oeDocsPrep: values.oeDocsPrep ?? null,
    oeDocsPrepAssignedAt: values.oeDocsPrepAssignedAt ?? null,
    oeDocsPrepAssignedBy: values.oeDocsPrepAssignedBy ?? null,
  };
};
