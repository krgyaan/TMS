import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Textarea } from "@/components/ui/textarea";
import { useProjectPurchaseOrders } from "@/hooks/api/useProjectDashboard";
import { useProjectVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { paymentAgainstOptions } from "../helpers/paymentRequest.schema";

const PAYMENT_AGAINST_OPTIONS = paymentAgainstOptions.map(o => ({ id: o.value, name: o.label }));

interface PaymentAgainstFieldProps {
    control: Control<any>;
    projectId: number;
}

export const PaymentAgainstField: React.FC<PaymentAgainstFieldProps> = ({ control, projectId }) => {
    const { watch } = useFormContext();
    const paymentAgainst = watch("paymentAgainst");

    const { data: poData } = useProjectPurchaseOrders(projectId);
    const { data: vwoData } = useProjectVendorWorkOrders(projectId);

    const poOptions = (poData?.purchaseOrders || []).map((po: any) => ({
        id: String(po.id),
        name: `${po.poNumber} - ${po.sellerName}`,
    }));

    const vwoOptions = (vwoData || []).map((vwo: any) => ({
        id: String(vwo.id),
        name: `${vwo.woNumber} - ${vwo.sellerName}`,
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <SelectField
                control={control}
                name="paymentAgainst"
                label="Payment Against"
                options={PAYMENT_AGAINST_OPTIONS}
                placeholder="Select payment type..."
            />

            {(paymentAgainst === "po" || paymentAgainst === "vwo") && (
                <SelectField
                    control={control}
                    name="selectedRefId"
                    label="Select PO/VWO"
                    options={mergedOptions}
                    placeholder="Choose a PO or VWO..."
                />
            )}

            {paymentAgainst === "vwo" && (
                <SelectField
                    control={control}
                    name="selectedPoId"
                    label="Select Work Order"
                    options={vwoOptions}
                    placeholder="Choose a Work Order..."
                />
            )}

            {paymentAgainst === "imprest" && (
                <div className="max-w-md">
                    <FieldWrapper control={control} name="remark" label="Remark">
                        {(field) => <Textarea {...field} placeholder="Enter remark for Imprest..." />}
                    </FieldWrapper>
                </div>
            )}
        </div>
    );
};
