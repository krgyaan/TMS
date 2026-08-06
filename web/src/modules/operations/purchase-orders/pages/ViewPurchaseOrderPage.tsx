import { useParams } from "react-router-dom";
import { usePurchaseOrderDetails } from "@/hooks/api/usePurchaseOrders";
import { OrderViewPage } from "@/modules/operations/order-view/OrderViewPage";
import { parseAttachments, type OrderViewData } from "@/modules/operations/order-view/orderView.types";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import type { PurchaseOrderView } from "../helpers/purchaseOrderView.types";

function toOrderViewData(po: PurchaseOrderView): OrderViewData {
    return {
        id: po.id,
        number: po.poNumber || `PO #${po.id}`,
        category: po.category,
        date: po.poDate,
        raisedByName: po.raisedByName,
        sellerName: po.sellerName,
        sellerEmail: po.sellerEmail,
        sellerAddress: po.sellerAddress,
        sellerGstNo: po.sellerGstNo,
        sellerPanNo: po.sellerPanNo,
        sellerMsmeNo: po.sellerMsmeNo,
        sellerCinNo: po.sellerCinNo,
        contactPersonName: po.contactPersonName,
        contactPersonPhone: po.contactPersonPhone,
        contactPersonEmail: po.contactPersonEmail,
        shipToName: po.shipToName,
        shippingAddress: po.shippingAddress,
        shipToGst: po.shipToGst,
        shipToPan: po.shipToPan,
        products: po.products,
        paymentRequests: po.paymentRequests,
        purchaseInvoices: po.purchaseInvoices,
        total: po.total,
        tdsPercentage: po.tdsPercentage,
        tdsAmount: po.tdsAmount,
        amountAfterTds: po.amountAfterTds,
        approved: po.poApproved,
        approvalRemark: po.poApprovalRemark,
        attachments: [
            ...(po.poType === "pi" ? [{ title: "Invoice Copy", paths: parseAttachments(po.piAttachments) }] : []),
            { title: "Technical Specs", paths: parseAttachments(po.technicalSpecsAttachments) },
            { title: "Accessories / Packaging List", paths: parseAttachments(po.accessoriesPackagingListAttachments) },
        ].filter((group) => group.paths.length > 0),
        generatedPdfVersions: po.generatedPdfVersions,
    };
}

const ViewPurchaseOrderPage = () => {
    const { poId: poIdParam } = useParams<{ poId: string }>();
    const poId = Number(poIdParam);

    const { data, isLoading, isError, error } = usePurchaseOrderDetails(poId);

    return (
        <OrderViewPage
            data={data ? toOrderViewData(data as PurchaseOrderView) : undefined}
            isLoading={isLoading}
            isError={isError}
            error={error}
            type="po"
            title="PO Details"
            amountLabel="Total PO Amount"
            notFoundMessage="Purchase Order not found."
            loadErrorMessage="Failed to load Purchase Order"
            pdfUrl={(id, label) => purchaseOrderApi.getPurchaseOrderPdfUrl(id, label)}
        />
    );
};

export default ViewPurchaseOrderPage;
