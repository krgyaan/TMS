import { useParams } from "react-router-dom";
import { useVendorWorkOrderDetails } from "@/hooks/api/useVendorWorkOrders";
import { OrderViewPage } from "@/modules/operations/order-view/OrderViewPage";
import { parseAttachments, type OrderViewData } from "@/modules/operations/order-view/orderView.types";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import type { VendorWorkOrderView } from "../helpers/vwoView.types";

function toOrderViewData(vwo: VendorWorkOrderView): OrderViewData {
    return {
        id: vwo.id,
        number: vwo.woNumber || `VWO #${vwo.id}`,
        category: vwo.category,
        date: vwo.woDate,
        raisedByName: vwo.raisedByName,
        sellerName: vwo.sellerName,
        sellerEmail: vwo.sellerEmail,
        sellerAddress: vwo.sellerAddress,
        sellerGstNo: vwo.sellerGstNo,
        sellerPanNo: vwo.sellerPanNo,
        sellerMsmeNo: vwo.sellerMsmeNo,
        sellerCinNo: vwo.sellerCinNo,
        contactPersonName: vwo.contactPersonName,
        contactPersonPhone: vwo.contactPersonPhone,
        contactPersonEmail: vwo.contactPersonEmail,
        shipToName: vwo.shipToName,
        shippingAddress: vwo.shippingAddress,
        shipToGst: vwo.shipToGst,
        shipToPan: vwo.shipToPan,
        products: vwo.products,
        paymentRequests: vwo.paymentRequests,
        purchaseInvoices: vwo.purchaseInvoices,
        total: vwo.total,
        tdsPercentage: vwo.tdsPercentage,
        tdsAmount: vwo.tdsAmount,
        amountAfterTds: vwo.amountAfterTds,
        approved: vwo.woApproved,
        approvalRemark: vwo.woApprovalRemark,
        attachments: [
            { title: "Scope of Work", paths: parseAttachments(vwo.scopeOfWork) },
            { title: "Accessories / Packaging List", paths: parseAttachments(vwo.accessoriesPackagingListAttachments) },
        ].filter((group) => group.paths.length > 0),
        generatedPdfVersions: vwo.generatedPdfVersions,
    };
}

const ViewVendorWorkOrderPage = () => {
    const { woId: woIdParam } = useParams<{ woId: string }>();
    const woId = Number(woIdParam);

    const { data, isLoading, isError, error } = useVendorWorkOrderDetails(woId);

    return (
        <OrderViewPage
            data={data ? toOrderViewData(data as VendorWorkOrderView) : undefined}
            isLoading={isLoading}
            isError={isError}
            error={error}
            type="vwo"
            title="VWO Details"
            amountLabel="Total VWO Amount"
            notFoundMessage="Vendor Work Order not found."
            loadErrorMessage="Failed to load Vendor Work Order"
            pdfUrl={(id, label) => vendorWorkOrderApi.getPdfDownloadUrl(id, label)}
        />
    );
};

export default ViewVendorWorkOrderPage;
