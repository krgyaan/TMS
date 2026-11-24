import type { CourierFormValues } from "./courier.schema";
import type { Courier, CreateCourierInput, UpdateCourierInput } from "./courier.types";

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toDateInputValue = (value: string | null | undefined): string => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
};

const toDateTimeInputValue = (value: string | null | undefined): string => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const emptyToNull = (value: string | null | undefined): string | null => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toIsoOrNull = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
};

export const buildCourierDefaultValues = (): CourierFormValues => ({
    toOrg: "",
    toName: "",
    toAddr: "",
    toPin: "",
    toMobile: "",
    empFrom: undefined as unknown as number,
    delDate: "",
    urgency: undefined as unknown as number,
    status: undefined,
    trackingNumber: "",
    courierProvider: "",
    pickupDate: "",
    docketNo: "",
    docketSlip: [],
    deliveryDate: "",
    deliveryPod: [],
    withinTime: undefined,
});

export const mapCourierToForm = (courier: Courier | null | undefined): CourierFormValues => {
    if (!courier) return buildCourierDefaultValues();

    return {
        toOrg: courier.toOrg ?? "",
        toName: courier.toName ?? "",
        toAddr: courier.toAddr ?? "",
        toPin: courier.toPin ?? "",
        toMobile: courier.toMobile ?? "",
        empFrom: courier.empFrom ?? (undefined as unknown as number),
        delDate: toDateInputValue(courier.delDate),
        urgency: courier.urgency ?? (undefined as unknown as number),
        status: courier.status,
        trackingNumber: courier.trackingNumber ?? "",
        courierProvider: courier.courierProvider ?? "",
        pickupDate: toDateTimeInputValue(courier.pickupDate),
        docketNo: courier.docketNo ?? "",
        docketSlip: courier.docketSlip ? [courier.docketSlip] : [],
        deliveryDate: toDateTimeInputValue(courier.deliveryDate),
        deliveryPod: courier.deliveryPod ? [courier.deliveryPod] : [],
        withinTime: courier.withinTime === true ? "1" : courier.withinTime === false ? "0" : undefined,
    };
};

export const mapCourierFormToCreate = (values: CourierFormValues): CreateCourierInput => ({
    toOrg: values.toOrg.trim(),
    toName: values.toName.trim(),
    toAddr: values.toAddr.trim(),
    toPin: values.toPin.trim(),
    toMobile: values.toMobile.trim(),
    empFrom: values.empFrom,
    delDate: values.delDate,
    urgency: values.urgency,
});

export const mapCourierFormToUpdate = (values: CourierFormValues): UpdateCourierInput => ({
    ...mapCourierFormToCreate(values),
    status: values.status,
    trackingNumber: emptyToNull(values.trackingNumber),
    courierProvider: emptyToNull(values.courierProvider),
    pickupDate: toIsoOrNull(values.pickupDate),
    docketNo: emptyToNull(values.docketNo),
    docketSlip: values.docketSlip?.[0] ?? null,
    deliveryDate: toIsoOrNull(values.deliveryDate),
    deliveryPod: values.deliveryPod?.[0] ?? null,
    withinTime: values.withinTime === "1" ? true : values.withinTime === "0" ? false : null,
});
