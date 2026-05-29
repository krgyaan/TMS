import type {
    CreatePurchaseOrderDTO,
    UpdatePurchaseOrderDTO,
} from "./projectDashboard.types";

interface ProductFormItem {
    id: string;
    description: string;
    hsnSac: string;
    qty: number;
    rate: number;
    gstRate: number;
}

interface SellerFormInfo {
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerGstNo: string;
    sellerPanNo: string;
    sellerMsmeNo: string;
}

interface ShipToFormInfo {
    partyId: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst: string;
    shipToPan: string;
}

export function mapProductsToDTO(products: ProductFormItem[]) {
    return products
        .filter((p) => p.description.trim() && p.qty > 0 && p.rate > 0)
        .map((p) => ({
            description: p.description,
            hsnSac: p.hsnSac,
            qty: p.qty,
            rate: p.rate,
            gstRate: p.gstRate,
        }));
}

export function mapFormToCreatePayload(
    tenderId: number,
    poDate: string,
    sellerInfo: SellerFormInfo,
    shipToInfo: ShipToFormInfo,
    products: ProductFormItem[],
    optional: {
        quotationNo?: string;
        quotationDate?: string;
        paymentTerms?: string;
        deliveryPeriod?: string;
        remarks?: string;
    }
): CreatePurchaseOrderDTO {
    return {
        tenderId,
        poDate,
        sellerId: sellerInfo.sellerId ? Number(sellerInfo.sellerId) : undefined,
        sellerName: sellerInfo.sellerName,
        sellerEmail: sellerInfo.sellerEmail,
        sellerAddress: sellerInfo.sellerAddress,
        sellerGstNo: sellerInfo.sellerGstNo,
        sellerPanNo: sellerInfo.sellerPanNo,
        sellerMsmeNo: sellerInfo.sellerMsmeNo,
        shipToName: shipToInfo.shipToName,
        shippingAddress: shipToInfo.shippingAddress,
        shipToGst: shipToInfo.shipToGst,
        shipToPan: shipToInfo.shipToPan,
        products: mapProductsToDTO(products),
        ...optional,
    };
}

export function mapFormToUpdatePayload(
    poDate: string,
    sellerInfo: SellerFormInfo,
    shipToInfo: ShipToFormInfo,
    products: ProductFormItem[],
    optional: {
        quotationNo?: string;
        quotationDate?: string;
        paymentTerms?: string;
        deliveryPeriod?: string;
        remarks?: string;
    }
): UpdatePurchaseOrderDTO {
    return {
        poDate,
        sellerId: sellerInfo.sellerId ? Number(sellerInfo.sellerId) : undefined,
        sellerName: sellerInfo.sellerName,
        sellerEmail: sellerInfo.sellerEmail,
        sellerAddress: sellerInfo.sellerAddress,
        sellerGstNo: sellerInfo.sellerGstNo,
        sellerPanNo: sellerInfo.sellerPanNo,
        sellerMsmeNo: sellerInfo.sellerMsmeNo,
        shipToName: shipToInfo.shipToName,
        shippingAddress: shipToInfo.shippingAddress,
        shipToGst: shipToInfo.shipToGst,
        shipToPan: shipToInfo.shipToPan,
        products: mapProductsToDTO(products),
        ...optional,
    };
}

export function mapProductToForm(product: any): ProductFormItem {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: product.description || "",
        hsnSac: product.hsnSac || "",
        qty: Number(product.qty) || 0,
        rate: Number(product.rate) || 0,
        gstRate: Number(product.gstRate) || 18,
    };
}

export function calculateProductTotals(products: ProductFormItem[]) {
    let subtotal = 0;
    let totalGst = 0;

    products.forEach((product) => {
        const lineTotal = product.qty * product.rate;
        const gstAmount = (lineTotal * product.gstRate) / 100;
        subtotal += lineTotal;
        totalGst += gstAmount;
    });

    return {
        subtotal,
        totalGst,
        grandTotal: subtotal + totalGst,
    };
}
