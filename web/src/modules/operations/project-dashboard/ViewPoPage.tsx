// src/pages/project-dashboard/ViewPO.tsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* ================================
   TYPES
================================ */
interface Product {
    id: number;
    description: string;
    hsn_sac: string;
    qty: number;
    rate: number;
    gst_rate: number;
}

interface PurchaseOrder {
    id: number;
    po_number: string;
    tender_id: number;
    tender_name: string;
    po_date: string;

    // Ship To
    ship_to_name: string;
    shipping_address: string;
    ship_to_gst: string;
    ship_to_pan: string;

    // Contact Person
    contact_person_name: string;
    contact_person_phone: string;
    contact_person_email: string;

    // Seller
    seller_name: string;
    seller_email: string;
    seller_address: string;
    seller_gst_no: string;
    seller_pan_no: string;
    seller_msme_no: string;

    // Quotation
    quotation_no: string;
    quotation_date: string;

    // Products
    products: Product[];

    // Further Details
    warranty_dispatch: string;
    warranty_installation: string;
    freight: string;
    payment_terms: string;
    transit_insurance: string;
    material_unloading: string;
    technical_specifications: string;
    delivery_period: string;
    documentation: string;
    remarks: string;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_PO: PurchaseOrder = {
    id: 1,
    po_number: "PO-2024-0145-001",
    tender_id: 101,
    tender_name: "Smart City Infrastructure Development Project - Phase 1",
    po_date: "2024-11-15",

    ship_to_name: "Smart City Infrastructure Depot",
    shipping_address: "Plot No. 45, Sector 17, Industrial Area, Municipal Corporation Office, Chandigarh - 160017",
    ship_to_gst: "04AAGCS7890K1Z6",
    ship_to_pan: "AAGCS7890K",

    contact_person_name: "Rajesh Kumar Sharma",
    contact_person_phone: "+91 98765 43210",
    contact_person_email: "rajesh.sharma@smartcity.gov.in",

    seller_name: "ABC Steel Suppliers Pvt Ltd",
    seller_email: "sales@abcsteel.com",
    seller_address: "Plot No. 123, Industrial Area Phase-2, Sector 56, Gurugram, Haryana - 122011",
    seller_gst_no: "06AABCA1234F1Z5",
    seller_pan_no: "AABCA1234F",
    seller_msme_no: "UDYAM-HR-01-0012345",

    quotation_no: "QT-ABC-2024-0892",
    quotation_date: "2024-11-10",

    products: [
        { id: 1, description: "TMT Steel Bars Fe-500D (12mm) - ISI Certified", hsn_sac: "7214", qty: 500, rate: 5200, gst_rate: 18 },
        { id: 2, description: "TMT Steel Bars Fe-500D (16mm) - ISI Certified", hsn_sac: "7214", qty: 300, rate: 5400, gst_rate: 18 },
        { id: 3, description: "MS Plates (10mm thickness) - Grade A", hsn_sac: "7208", qty: 100, rate: 6800, gst_rate: 18 },
        { id: 4, description: "Binding Wire (18 Gauge) - 25kg Bundle", hsn_sac: "7217", qty: 50, rate: 4200, gst_rate: 18 },
    ],

    warranty_dispatch: "12 Months from date of dispatch",
    warranty_installation: "18 Months from date of installation",
    freight: "FOR Destination - Included in Price",
    payment_terms: "30% Advance, 60% on Delivery, 10% after Installation",
    transit_insurance: "Covered by Seller",
    material_unloading: "Buyer's Scope",
    technical_specifications: "As per IS 1786:2008 and attached technical specification sheet",
    delivery_period: "4-6 weeks from PO confirmation",
    documentation: "Test Certificates, Warranty Cards, Delivery Challan, Invoice",
    remarks: "Material should be delivered in proper packaging. All items must have batch numbers and QC stamps.",
};

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/* ================================
   SIMPLE TABLE ROW COMPONENT
================================ */
interface InfoRowProps {
    label: string;
    value: string | null | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
    <tr className="border-b">
        <th className="text-left py-2 px-3 bg-muted/30 font-semibold text-sm w-1/4">{label}</th>
        <td className="py-2 px-3 text-sm">{value || "-"}</td>
    </tr>
);

/* ================================
   MAIN COMPONENT
================================ */
export default function ViewPoPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const poId = Number(id);

    // const { data: poData } = {}; //Hook to be implemented

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background py-6">
            <div className="container mx-auto px-4">
                {/* Back Button */}
                <div className="mb-4 print:hidden">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>

                {/* Main Card */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b ">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">Purchase Order {po.po_number}</CardTitle>
                            <div className="flex gap-2 print:hidden">
                                <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* Ship To Details */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Ship To Details</h5>
                            <table className="w-full border">
                                <tbody>
                                    <InfoRow label="Ship To Name" value={po.ship_to_name} />
                                    <InfoRow label="Project Name" value={po.tender_name} />
                                    <InfoRow label="Shipping Address" value={po.shipping_address} />
                                    <InfoRow label="GST" value={po.ship_to_gst} />
                                    <InfoRow label="PAN" value={po.ship_to_pan} />
                                </tbody>
                            </table>
                        </div>

                        {/* Contact Person */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Contact Person on Site</h5>
                            <table className="w-full border">
                                <tbody>
                                    <InfoRow label="Name" value={po.contact_person_name} />
                                    <InfoRow label="Phone" value={po.contact_person_phone} />
                                    <InfoRow label="Email" value={po.contact_person_email} />
                                </tbody>
                            </table>
                        </div>

                        {/* Seller Information */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Seller Information</h5>
                            <table className="w-full border">
                                <tbody>
                                    <InfoRow label="Seller Name" value={po.seller_name} />
                                    <InfoRow label="Email" value={po.seller_email} />
                                    <InfoRow label="Address" value={po.seller_address} />
                                    <InfoRow label="GST No." value={po.seller_gst_no} />
                                    <InfoRow label="PAN No." value={po.seller_pan_no} />
                                    <InfoRow label="MSME No." value={po.seller_msme_no} />
                                </tbody>
                            </table>
                        </div>

                        {/* Quotation */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Quotation</h5>
                            <table className="w-full border">
                                <tbody>
                                    <InfoRow label="Quotation No." value={po.quotation_no} />
                                    <InfoRow label="Quotation Date" value={po.quotation_date} />
                                    <InfoRow label="PO Date" value={po.po_date} />
                                </tbody>
                            </table>
                        </div>

                        {/* Products */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Products</h5>
                            <Table className="border">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">HSN/SAC</TableHead>
                                        <TableHead className="font-semibold text-right">Qty</TableHead>
                                        <TableHead className="font-semibold text-right">Rate</TableHead>
                                        <TableHead className="font-semibold text-right">GST %</TableHead>
                                        <TableHead className="font-semibold text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.products.map(product => {
                                        const total = product.qty * product.rate;
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell>{product.description}</TableCell>
                                                <TableCell>{product.hsn_sac}</TableCell>
                                                <TableCell className="text-right">{product.qty}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(product.rate)}</TableCell>
                                                <TableCell className="text-right">{product.gst_rate}%</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Further Details */}
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-3">Further Details</h5>
                            <table className="w-full border">
                                <tbody>
                                    <InfoRow label="Warranty from Dispatch" value={po.warranty_dispatch} />
                                    <InfoRow label="Warranty from Installation" value={po.warranty_installation} />
                                    <InfoRow label="Freight" value={po.freight} />
                                    <InfoRow label="Payment Terms" value={po.payment_terms} />
                                    <InfoRow label="Transit Insurance" value={po.transit_insurance} />
                                    <InfoRow label="Material Unloading" value={po.material_unloading} />
                                    <InfoRow label="Technical Specifications" value={po.technical_specifications} />
                                    <InfoRow label="Delivery Period" value={po.delivery_period} />
                                    <InfoRow label="Documentation" value={po.documentation} />
                                    <InfoRow label="Remarks" value={po.remarks} />
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
