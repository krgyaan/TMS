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
    preSelectedPoId?: number;
}

export const PaymentAgainstField: React.FC<PaymentAgainstFieldProps> = ({ control, projectId, preSelectedPoId }) => {
    const { watch, setValue } = useFormContext();
    const paymentAgainst = watch("paymentAgainst");

    const { data: poData } = useProjectPurchaseOrders(projectId);
    const { data: vwoData } = useProjectVendorWorkOrders(projectId);

    React.useEffect(() => {
        if (preSelectedPoId) {
            setValue("paymentAgainst", "po");
            setValue("selectedPoId", String(preSelectedPoId));
        }
    }, [preSelectedPoId, setValue]);

    const poOptions = (poData?.purchaseOrders || [])
        .filter((po: any) => !preSelectedPoId || String(po.id) === String(preSelectedPoId))
        .map((po: any) => ({
            id: String(po.id),
            name: `${po.poNumber} - ${po.sellerName}`,
        }));

    const vwoOptions = (vwoData || []).map((vwo: any) => ({
        id: String(vwo.id),
        name: `${vwo.woNumber} - ${vwo.sellerName}`,
    }));

    const isPoPreSelected = !!preSelectedPoId;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <SelectField
                control={control}
                name="paymentAgainst"
                label="Payment Against"
                options={PAYMENT_AGAINST_OPTIONS}
                placeholder="Select payment type..."
                disabled={isPoPreSelected}
            />

            {paymentAgainst === "po" && (
                <SelectField
                    control={control}
                    name="selectedPoId"
                    label="Select PO"
                    options={poOptions}
                    placeholder="Choose a PO..."
                    disabled={isPoPreSelected}
                />
            )}

            {paymentAgainst === "vwo" && (
                <SelectField
                    control={control}
                    name="selectedVwoId"
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
