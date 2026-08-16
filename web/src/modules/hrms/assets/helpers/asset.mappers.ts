import { fileUploadService } from "@/services/api/file-upload.service";

export const toDateInput = (date: string | null | undefined): string => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export const getAssetFileUrl = (storedValue: string | null | undefined): string => {
  if (!storedValue) return "";
  if (storedValue.startsWith("uploads/")) return `/${storedValue}`;
  if (storedValue.includes("/")) return fileUploadService.getFileUrl(storedValue);
  return `/uploads/hrms/assets/${storedValue}`;
};

export const buildCreatePayload = (
  data: Record<string, any>,
  files: { purchaseInvoice: string[]; warrantyCard: string[]; assignmentForm: string[]; assetPhotos: string[] },
  selectedAccessories: string[],
  currentUserId?: number,
): Record<string, any> => {
  const payload: Record<string, any> = {};

  Object.entries(data).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (key === "accessories" || key === "typeSpecs") return;
    payload[key] = val;
  });

  payload.accessories = selectedAccessories;
  if (data.typeSpecs && Object.keys(data.typeSpecs).length > 0) {
    payload.typeSpecs = data.typeSpecs;
  }

  payload.assetPhotos = files.assetPhotos;
  payload.purchaseInvoice = files.purchaseInvoice[0] || null;
  payload.warrantyCard = files.warrantyCard[0] || null;
  payload.assignmentForm = files.assignmentForm[0] || null;

  return payload;
};

export const buildEditPayload = (
  data: Record<string, any>,
  removedFiles: string[],
  files: { purchaseInvoice: string[]; warrantyCard: string[]; assignmentForm: string[]; assetPhotos: string[] },
  currentUserId?: number,
): Record<string, any> => {
  const payload: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "null") {
      if (key === "typeSpecs") return;
      payload[key] = value;
    }
  });

  if (data.typeSpecs && Object.keys(data.typeSpecs).length > 0) {
    payload.typeSpecs = data.typeSpecs;
  }

  payload.removedFiles = removedFiles;
  payload.assetPhotos = files.assetPhotos;
  if (files.purchaseInvoice[0]) payload.purchaseInvoice = files.purchaseInvoice[0];
  if (files.warrantyCard[0]) payload.warrantyCard = files.warrantyCard[0];
  if (files.assignmentForm[0]) payload.assignmentForm = files.assignmentForm[0];

  return payload;
};

export const formatAssetDate = (dateValue: string | null | undefined): string => {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
