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
  return `/uploads/hrms/assets/${storedValue}`;
};

export const buildCreateFormData = (
  data: Record<string, any>,
  fileRefs: Record<string, any>,
  selectedAccessories: string[],
  currentUserId?: number,
): FormData => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (key === "accessories" || key === "typeSpecs") return;
    formData.append(key, String(val));
  });

  formData.append("accessories", JSON.stringify(selectedAccessories));
  if (data.typeSpecs && Object.keys(data.typeSpecs).length > 0) {
    formData.append("typeSpecs", JSON.stringify(data.typeSpecs));
  }

  const purchaseInvoice = fileRefs.purchaseInvoiceRef?.current?.files?.[0];
  if (purchaseInvoice) formData.append("purchaseInvoice", purchaseInvoice);

  const warrantyCard = fileRefs.warrantyCardRef?.current?.files?.[0];
  if (warrantyCard) formData.append("warrantyCard", warrantyCard);

  const assignmentForm = fileRefs.assignmentFormRef?.current?.files?.[0];
  if (assignmentForm) formData.append("assignmentForm", assignmentForm);

  const assetPhotos = fileRefs.assetPhotosRef?.current?.files;
  if (assetPhotos) {
    Array.from(assetPhotos).forEach((photo) =>
      formData.append("assetPhotos", photo),
    );
  }

  return formData;
};

export const buildEditFormData = (
  data: Record<string, any>,
  removedFiles: string[],
  newFiles: Record<string, any>,
  currentUserId?: number,
): FormData => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "null") {
      if (key === "typeSpecs") return;
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  if (data.typeSpecs && Object.keys(data.typeSpecs).length > 0) {
    formData.append("typeSpecs", JSON.stringify(data.typeSpecs));
  }

  formData.append("removedFiles", JSON.stringify(removedFiles));

  if (newFiles.purchaseInvoice)
    formData.append("purchaseInvoice", newFiles.purchaseInvoice);

  if (newFiles.warrantyCard)
    formData.append("warrantyCard", newFiles.warrantyCard);

  if (newFiles.assignmentForm)
    formData.append("assignmentForm", newFiles.assignmentForm);

  newFiles.assetPhotos.forEach((file: any) => {
    formData.append("assetPhotos", file);
  });

  return formData;
};

export const formatAssetDate = (dateValue: string | null | undefined): string => {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
