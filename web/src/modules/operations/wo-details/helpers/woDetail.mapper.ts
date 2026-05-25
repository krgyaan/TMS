import type {
  Page1FormValues,
  Page2FormValues,
  Page3FormValues,
  Page4FormValues,
  Page5FormValues,
  Page6FormValues,
  Page7FormValues,
} from "./woDetail.types";

const stringToBool = (val: string | undefined | null): boolean | undefined => {
  if (!val) return undefined;
  const lower = val.toLowerCase();
  if (lower === "true" || lower === "yes") return true;
  if (lower === "false" || lower === "no") return false;
  return undefined;
};

const boolToString = (val: boolean | undefined | null): string | undefined => {
  if (val === true) return "true";
  if (val === false) return "false";
  return undefined;
};

const emptyStringToNull = (val: string | undefined | null): string | null | undefined => {
  if (val === "") return null;
  return val;
};

export const formToApi = {
  page1(form: Page1FormValues) {
    return {
      contacts: form.contacts?.map((c) => ({
        id: c.id,
        name: c.name || null,
        organization: c.organization || null,
        departments: c.departments || null,
        designation: c.designation || null,
        phone: c.phone || null,
        email: c.email || null,
      })),
      tenderDocumentsChecklist: form.tenderDocumentsChecklist,
    };
  },

  page2(form: Page2FormValues) {
    return {
      ldApplicable: stringToBool(form.ldApplicable),
      maxLd: emptyStringToNull(form.maxLd),
      ldStartDate: emptyStringToNull(form.ldStartDate),
      maxLdDate: emptyStringToNull(form.maxLdDate),
      isPbgApplicable: stringToBool(form.isPbgApplicable),
      filledBgFormat: emptyStringToNull(form.filledBgFormat),
      pbgBgId: form.pbgBgId ?? null,
      isContractAgreement: stringToBool(form.isContractAgreement),
      contractAgreementFormat: emptyStringToNull(form.contractAgreementFormat),
      detailedPoApplicable: stringToBool(form.detailedPoApplicable),
      detailedPoFollowupId: form.detailedPoFollowupId ?? null,
    };
  },

  page3(form: Page3FormValues) {
    return {
      swotStrengths: form.swotStrengths || null,
      swotWeaknesses: form.swotWeaknesses || null,
      swotOpportunities: form.swotOpportunities || null,
      swotThreats: form.swotThreats || null,
    };
  },

  page4(form: Page4FormValues) {
    return {
      buybackBoqApplicable: stringToBool(form.buybackBoqApplicable),
      billingBoq: form.billingBoq?.map((item) => ({
        id: item.id,
        srNo: item.srNo,
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
      buybackBoq: form.buybackBoq?.map((item) => ({
        id: item.id,
        srNo: item.srNo,
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
      billingAddresses: form.billingAddresses?.map((a) => ({
        id: a.id,
        srNos: a.srNos,
        customerName: a.customerName,
        address: a.address,
        gst: a.gst || null,
      })),
      shippingAddresses: form.shippingAddresses?.map((a) => ({
        id: a.id,
        srNos: a.srNos,
        customerName: a.customerName,
        address: a.address,
        gst: a.gst || null,
      })),
    };
  },

  page5(form: Page5FormValues) {
    return {
      siteVisitNeeded: stringToBool(form.siteVisitNeeded),
      siteVisitPerson: form.siteVisitPerson?.name?.trim()
        ? {
            name: form.siteVisitPerson.name,
            phone: form.siteVisitPerson.phone || "",
            email: form.siteVisitPerson.email || "",
          }
        : null,
      documentsFromTendering: form.documentsFromTendering || null,
      documentsNeeded: form.documentsNeeded || null,
      documentsInHouse: form.documentsInHouse || null,
    };
  },

  page6(form: Page6FormValues) {
    return {
      costingSheetLink: emptyStringToNull(form.costingSheetLink),
      hasDiscrepancies: stringToBool(form.hasDiscrepancies),
      discrepancyComments: emptyStringToNull(form.discrepancyComments),
    };
  },

  page7(form: Page7FormValues) {
    return {
      oeWoAmendmentNeeded: stringToBool(form.oeWoAmendmentNeeded),
      amendments: form.amendments?.map((a) => ({
        id: a.id,
        pageNo: a.pageNo,
        clauseNo: a.clauseNo,
        currentStatement: a.currentStatement,
        correctedStatement: a.correctedStatement,
      })),
      oeSignaturePrepared: stringToBool(form.oeSignaturePrepared),
      courierRequestPrepared: stringToBool(form.courierRequestPrepared),
    };
  },
};

type ApiResponse = Record<string, unknown>;

export const apiToForm = {
  page1(api: ApiResponse): Partial<Page1FormValues> {
    return {
      contacts: (api.contacts as Page1FormValues["contacts"]) ?? undefined,
      tenderDocumentsChecklist: (api.tenderDocumentsChecklist as Page1FormValues["tenderDocumentsChecklist"]) ?? undefined,
    };
  },

  page2(api: ApiResponse): Partial<Page2FormValues> {
    return {
      ldApplicable: boolToString(api.ldApplicable as boolean | undefined | null),
      maxLd: (api.maxLd as string) ?? "",
      ldStartDate: (api.ldStartDate as string) ?? "",
      maxLdDate: (api.maxLdDate as string) ?? "",
      isPbgApplicable: boolToString(api.isPbgApplicable as boolean | undefined | null),
      filledBgFormat: (api.filledBgFormat as string) ?? "",
      pbgBgId: (api.pbgBgId as number | undefined) ?? undefined,
      isContractAgreement: boolToString(api.isContractAgreement as boolean | undefined | null),
      contractAgreementFormat: (api.contractAgreementFormat as string) ?? "",
      detailedPoApplicable: boolToString(api.detailedPoApplicable as boolean | undefined | null),
      detailedPoFollowupId: (api.detailedPoFollowupId as number | undefined) ?? undefined,
    };
  },

  page3(api: ApiResponse): Partial<Page3FormValues> {
    return {
      swotStrengths: (api.swotStrengths as string) ?? "",
      swotWeaknesses: (api.swotWeaknesses as string) ?? "",
      swotOpportunities: (api.swotOpportunities as string) ?? "",
      swotThreats: (api.swotThreats as string) ?? "",
    };
  },

  page4(api: ApiResponse): Partial<Page4FormValues> {
    return {
      buybackBoqApplicable: boolToString(api.buybackBoqApplicable as boolean | undefined | null) ?? "false",
      billingBoq: (api.billingBoq as Page4FormValues["billingBoq"]) ?? undefined,
      buybackBoq: (api.buybackBoq as Page4FormValues["buybackBoq"]) ?? undefined,
      billingAddresses: (api.billingAddresses as Page4FormValues["billingAddresses"]) ?? undefined,
      shippingAddresses: (api.shippingAddresses as Page4FormValues["shippingAddresses"]) ?? undefined,
    };
  },

  page5(api: ApiResponse): Partial<Page5FormValues> {
    return {
      siteVisitNeeded: boolToString(api.siteVisitNeeded as boolean | undefined | null),
      siteVisitPerson: (api.siteVisitPerson as Page5FormValues["siteVisitPerson"]) ?? undefined,
      documentsFromTendering: (api.documentsFromTendering as Page5FormValues["documentsFromTendering"]) ?? undefined,
      documentsNeeded: (api.documentsNeeded as Page5FormValues["documentsNeeded"]) ?? undefined,
      documentsInHouse: (api.documentsInHouse as Page5FormValues["documentsInHouse"]) ?? undefined,
    };
  },

  page6(api: ApiResponse): Partial<Page6FormValues> {
    return {
      costingSheetLink: (api.costingSheetLink as string) ?? "",
      hasDiscrepancies: boolToString(api.hasDiscrepancies as boolean | undefined | null),
      discrepancyComments: (api.discrepancyComments as string) ?? "",
    };
  },

  page7(api: ApiResponse): Partial<Page7FormValues> {
    return {
      oeWoAmendmentNeeded: boolToString(api.oeWoAmendmentNeeded as boolean | undefined | null),
      amendments: (api.amendments as Page7FormValues["amendments"]) ?? undefined,
      oeSignaturePrepared: boolToString(api.oeSignaturePrepared as boolean | undefined | null),
      courierRequestPrepared: boolToString(api.courierRequestPrepared as boolean | undefined | null),
    };
  },
};
