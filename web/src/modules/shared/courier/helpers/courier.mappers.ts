import type { CourierFormValues } from "./courier.schema";
import type { Courier, CreateCourierInput, UpdateCourierInput } from "./courier.types";

const toDateInputValue = (value: string | null | undefined): string => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
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
});
