import { SelectField } from "@/components/form/SelectField";
import { useProjectPurchaseOrders } from "@/hooks/api/usePurchaseOrders";
import { useProjectVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";
import type { VendorWorkOrderRow } from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";
import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { paymentAgainstOptions } from "../helpers/paymentRequest.schema";
import { PoDetailsCard } from "./PoDetailsCard";
import { VwoDetailsCard } from "./VwoDetailsCard";

const PAYMENT_AGAINST_OPTIONS = paymentAgainstOptions.map(o => ({ id: o.value, name: o.label }));

interface PaymentAgainstFieldProps {
    control: Control<any>;
    projectId: number;
    preSelectedPoId?: number;
    preSelectedVwoId?: number;
    onRemainingChange?: (remaining: number) => void;
}

export const PaymentAgainstField: React.FC<PaymentAgainstFieldProps> = ({ control, projectId, preSelectedPoId, preSelectedVwoId, onRemainingChange }) => {
    const { watch, setValue, setError, clearErrors } = useFormContext();
    const paymentAgainst = watch("paymentAgainst");
    const selectedPoId = watch("selectedPoId");
    const selectedVwoId = watch("selectedVwoId");
    const amount = watch("amount");

    const { data: poData } = useProjectPurchaseOrders(projectId);
    const { data: vwoData } = useProjectVendorWorkOrders(projectId);

    React.useEffect(() => {
        if (preSelectedPoId) {
            setValue("paymentAgainst", "po");
            setValue("selectedPoId", String(preSelectedPoId));
        } else if (preSelectedVwoId) {
            setValue("paymentAgainst", "vwo");
            setValue("selectedVwoId", String(preSelectedVwoId));
        }
    }, [preSelectedPoId, preSelectedVwoId, setValue]);

    const poOptions = (poData?.purchaseOrders || [])
        .filter((po: any) => po.poApproved === true)
        .filter((po: any) => !preSelectedPoId || String(po.id) === String(preSelectedPoId))
        .map((po: any) => ({
            id: String(po.id),
            name: `${po.poNumber} - ${po.sellerName}`,
        }));

    const vwoOptions = (vwoData || [])
        .filter((vwo: any) => vwo.woApproved === true)
        .filter((vwo: any) => !preSelectedVwoId || String(vwo.id) === String(preSelectedVwoId))
        .map((vwo: any) => ({
            id: String(vwo.id),
            name: `${vwo.woNumber} - ${vwo.sellerName}`,
        }));

    const isPreSelected = !!preSelectedPoId || !!preSelectedVwoId;

    const selectedPo: PurchaseOrderRow | undefined = React.useMemo(() => {
        if (!selectedPoId || !poData?.purchaseOrders) return undefined;
        return poData.purchaseOrders.find((po: PurchaseOrderRow) => String(po.id) === String(selectedPoId));
    }, [selectedPoId, poData?.purchaseOrders]);

    const selectedVwo: VendorWorkOrderRow | undefined = React.useMemo(() => {
        if (!selectedVwoId || !vwoData) return undefined;
        return vwoData.find((vwo: VendorWorkOrderRow) => String(vwo.id) === String(selectedVwoId));
    }, [selectedVwoId, vwoData]);

    const remainingPo = React.useMemo(() => {
        if (!selectedPo) return 0;
        const cap = selectedPo.amountAfterTds ? Number(selectedPo.amountAfterTds) : Number(selectedPo.grandTotal || 0);
        return cap - Number(selectedPo.totalPaymentRequested || 0);
    }, [selectedPo]);

    const remainingVwo = React.useMemo(() => {
        if (!selectedVwo) return 0;
        const cap = selectedVwo.amountAfterTds ? Number(selectedVwo.amountAfterTds) : Number(selectedVwo.grandTotal || 0);
        return cap - Number(selectedVwo.totalPaymentRequested || 0);
    }, [selectedVwo]);

    const remaining = paymentAgainst === "vwo" ? remainingVwo : remainingPo;

    React.useEffect(() => {
        onRemainingChange?.(remaining);
    }, [remaining, onRemainingChange]);

    React.useEffect(() => {
        if (paymentAgainst === "vwo") {
            if (!selectedVwo) {
                clearErrors("amount");
                clearErrors("selectedVwoId");
                return;
            }
            if (remainingVwo <= 0) {
                setError("selectedVwoId", { message: "This Work Order has no remaining balance" });
            } else {
                clearErrors("selectedVwoId");
            }
            if (amount != null && amount > 0 && amount > remainingVwo) {
                setError("amount", { message: `Amount exceeds remaining Work Order balance (${formatINR(remainingVwo)})` });
            } else {
                clearErrors("amount");
            }
            return;
        }

        if (!selectedPo || paymentAgainst !== "po") {
            clearErrors("amount");
            return;
        }
        if (remainingPo <= 0) {
            setError("selectedPoId", { message: "This PO has no remaining balance" });
        } else {
            clearErrors("selectedPoId");
        }
        if (amount != null && amount > 0 && amount > remainingPo) {
            setError("amount", { message: `Amount exceeds remaining PO balance (${formatINR(remainingPo)})` });
        } else {
            clearErrors("amount");
        }
    }, [selectedPo, selectedVwo, remainingPo, remainingVwo, amount, paymentAgainst, setError, clearErrors]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name="paymentAgainst"
                label="Payment Against"
                options={PAYMENT_AGAINST_OPTIONS}
                placeholder="Select payment type..."
                disabled={isPreSelected}
            />

            {paymentAgainst === "po" && (
                <SelectField
                    control={control}
                    name="selectedPoId"
                    label="Select PO"
                    options={poOptions}
                    placeholder="Choose a PO..."
                    disabled={isPreSelected}
                />
            )}


            {paymentAgainst === "vwo" && (
                <SelectField
                control={control}
                name="selectedVwoId"
                label="Select Work Order"
                options={vwoOptions}
                placeholder="Choose a Work Order..."
                disabled={isPreSelected}
                />
            )}
            <div className="col-span-1 md:col-span-3">
                {paymentAgainst === "po" && selectedPo && (
                    <PoDetailsCard po={selectedPo} requestAmount={amount} />
                )}
                {paymentAgainst === "vwo" && selectedVwo && (
                    <VwoDetailsCard vwo={selectedVwo} requestAmount={amount} />
                )}
            </div>
        </div>
    );
};
