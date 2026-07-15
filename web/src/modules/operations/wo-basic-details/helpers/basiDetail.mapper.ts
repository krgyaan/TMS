import { parseFileArray } from "@/lib/utils";
import type { AssignOeFormValues, WoBasicDetailFormValues } from "./basiDetail.types";
import type { WoBasicDetail, CreateWoBasicDetailDto, UpdateWoBasicDetailDto } from "@/modules/operations/types/wo.types";

export const buildDefaultValues = (): WoBasicDetailFormValues => ({
  tenderId: null,
  teamId: null,
  organizationId: null,
  itemId: null,
  locationId: null,
  woNumber: "",
  woDate: null,
  woValuePreGst: 0,
  woValueGstAmt: 0,
  budgetPreGst: 0,
  receiptPreGst: 0,
  grossMargin: 0,
  finalPrice: 0,
  pricesChanged: "false",
  budgetSupply: 0,
  budgetService: 0,
  budgetFreight: 0,
  budgetAdmin: 0,
  budgetBuybackSale: 0,
  budgetGemCharges: 0,
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
    finalPrice: Number(data.finalPrice) || 0,
    pricesChanged: "false",
    budgetSupply: Number(data.budgetSupply) || 0,
    budgetService: Number(data.budgetService) || 0,
    budgetFreight: Number(data.budgetFreight) || 0,
    budgetAdmin: Number(data.budgetAdmin) || 0,
    budgetBuybackSale: Number(data.budgetBuybackSale) || 0,
    budgetGemCharges: Number(data.budgetGemCharges) || 0,
    projectCode: data.projectCode || "",
    projectName: data.projectName || "",
    woDraft: parseFileArray(data.woDraft),
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
  if (values.finalPrice !== undefined && values.finalPrice > 0) payload.finalPrice = String(values.finalPrice);
  if (values.budgetSupply !== undefined && values.budgetSupply > 0) payload.budgetSupply = String(values.budgetSupply);
  if (values.budgetService !== undefined && values.budgetService > 0) payload.budgetService = String(values.budgetService);
  if (values.budgetFreight !== undefined && values.budgetFreight > 0) payload.budgetFreight = String(values.budgetFreight);
  if (values.budgetAdmin !== undefined && values.budgetAdmin > 0) payload.budgetAdmin = String(values.budgetAdmin);
  if (values.budgetBuybackSale !== undefined && values.budgetBuybackSale > 0) payload.budgetBuybackSale = String(values.budgetBuybackSale);
  if (values.budgetGemCharges !== undefined && values.budgetGemCharges > 0) payload.budgetGemCharges = String(values.budgetGemCharges);
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
  if (values.finalPrice !== undefined && values.finalPrice > 0) payload.finalPrice = String(values.finalPrice);
  if (values.budgetSupply !== undefined && values.budgetSupply > 0) payload.budgetSupply = String(values.budgetSupply);
  if (values.budgetService !== undefined && values.budgetService > 0) payload.budgetService = String(values.budgetService);
  if (values.budgetFreight !== undefined && values.budgetFreight > 0) payload.budgetFreight = String(values.budgetFreight);
  if (values.budgetAdmin !== undefined && values.budgetAdmin > 0) payload.budgetAdmin = String(values.budgetAdmin);
  if (values.budgetBuybackSale !== undefined && values.budgetBuybackSale > 0) payload.budgetBuybackSale = String(values.budgetBuybackSale);
  if (values.budgetGemCharges !== undefined && values.budgetGemCharges > 0) payload.budgetGemCharges = String(values.budgetGemCharges);
  if (values.woDraft && values.woDraft.length > 0) payload.woDraft = JSON.stringify(values.woDraft);

  return payload;
};

export function buildDefaultAssigeOeValues(): AssignOeFormValues {
    return {
        woBasicDetailId: 0,
        oeFirst: null,
        oeFirstAssignedAt: null,
        oeFirstAssignedBy: null,
        oeSiteVisit: null,
        oeSiteVisitAssignedAt: null,
        oeSiteVisitAssignedBy: null,
        oeDocsPrep: null,
        oeDocsPrepAssignedAt: null,
        oeDocsPrepAssignedBy: null,
    };
}

export function mapFormToAssignOePayload(data: WoBasicDetail | AssignOeFormValues): AssignOeFormValues {
    // Handle both WoBasicDetail (from API) and AssignOeFormValues (from form)
    const woBasicDetailId = 'woBasicDetailId' in data
        ? data.woBasicDetailId
        : data.id;

    return {
        woBasicDetailId: Number(woBasicDetailId),
        oeFirst: data.oeFirst ? Number(data.oeFirst) : null,
        oeFirstAssignedAt: data.oeFirstAssignedAt ?? null,
        oeFirstAssignedBy: data.oeFirstAssignedBy ? Number(data.oeFirstAssignedBy) : null,
        oeSiteVisit: data.oeSiteVisit ? Number(data.oeSiteVisit) : null,
        oeSiteVisitAssignedAt: data.oeSiteVisitAssignedAt ?? null,
        oeSiteVisitAssignedBy: data.oeSiteVisitAssignedBy ? Number(data.oeSiteVisitAssignedBy) : null,
        oeDocsPrep: data.oeDocsPrep ? Number(data.oeDocsPrep) : null,
        oeDocsPrepAssignedAt: data.oeDocsPrepAssignedAt ?? null,
        oeDocsPrepAssignedBy: data.oeDocsPrepAssignedBy ? Number(data.oeDocsPrepAssignedBy) : null,
    };
}
