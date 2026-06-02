import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  Truck,
  UserCheck,
  FileText,
} from "lucide-react";
import type { PurchaseOrderFormValues, ProductFormItem } from "../helpers/purchaseOrder.schema";
import { calculateTotals, formatCurrency } from "../helpers/projectDashboard.mapper";

function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertBelow1000 = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertBelow1000(n % 100) : "");
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.round(num % 1000);

  let result = "";
  if (crore) result += convertBelow1000(crore) + " Crore ";
  if (lakh) result += convertBelow1000(lakh) + " Lakh ";
  if (thousand) result += convertBelow1000(thousand) + " Thousand ";
  if (remainder) result += convertBelow1000(remainder);

  return result.trim() + " Only";
}

function SummaryRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-dashed last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function ProductRow({ index, product }: { index: number; product: ProductFormItem }) {
  const qty = product.qty ?? 0;
  const rate = product.rate ?? 0;
  const amount = qty * rate;
  const gstAmount = (amount * product.gstRate) / 100;
  const total = amount + gstAmount;

  return (
    <tr className="border-b border-dashed last:border-0">
      <td className="py-2 px-2 text-sm text-center">{index + 1}</td>
      <td className="py-2 px-2 text-sm">{product.description}</td>
      <td className="py-2 px-2 text-sm font-mono">{product.hsnSac}</td>
      <td className="py-2 px-2 text-sm text-right">{qty}</td>
      <td className="py-2 px-2 text-sm text-right">{formatCurrency(rate)}</td>
      <td className="py-2 px-2 text-sm text-right">{formatCurrency(amount)}</td>
      <td className="py-2 px-2 text-sm text-center">{product.gstRate}%</td>
      <td className="py-2 px-2 text-sm text-right">{formatCurrency(gstAmount)}</td>
      <td className="py-2 px-2 text-sm text-right font-medium">{formatCurrency(total)}</td>
    </tr>
  );
}

interface POFormPreviewProps {
  formValues: PurchaseOrderFormValues;
  projectName?: string;
  nextPONumber?: string;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function POFormPreview({
  formValues,
  projectName,
  nextPONumber,
  isSubmitting,
  onBack,
  onSubmit,
}: POFormPreviewProps) {
  const validProducts = formValues.products.filter(
    (p) => p.description && p.qty !== null && p.rate !== null && p.qty > 0
  );
  const { subtotal, totalGst, grandTotal } = calculateTotals(formValues.products);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Review Purchase Order</h2>
          <p className="text-sm text-muted-foreground">
            Review all details before creating the PO
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Edit
        </Button>
      </div>

      {/* Company Header */}
      <Card>
        <CardHeader className="py-3 border-b bg-muted/20">
          <CardTitle className="text-center text-base font-bold">
            PURCHASE ORDER
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="p-4 w-1/6 align-top">
                  <div className="h-14 w-14 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    VE
                  </div>
                </td>
                <td className="p-4 w-2/5 align-top">
                  <strong>Volks Energie Pvt. Ltd.</strong><br />
                  B-1/D8, 2nd floor, Mohan Cooperative Industrial Estate,<br />
                  New Delhi – 110044<br />
                  Mob: +91 9650393636<br />
                  email: goyal@volksenergie.in<br />
                  PAN No.: AADCV9396C<br />
                  GST No.: 07AADCV9396C1Z
                </td>
                <td className="p-4 w-2/5 align-top">
                  <strong>Date:</strong> {formValues.poDate || "—"}<br />
                  <strong>PO No.:</strong> {nextPONumber || "—"}<br />
                  <strong>Project Name:</strong> {projectName || "—"}<br />
                  <strong>Contact Person:</strong> {formValues.contactPersonName || "—"}<br />
                  <strong>Contact No.:</strong> {formValues.contactPersonPhone || "—"}<br />
                  <strong>Contact Email:</strong> {formValues.contactPersonEmail || "—"}
                </td>
              </tr>
              <tr className="border-b">
                <td colSpan={2} className="p-4 w-1/2 align-top">
                  <strong>Vendor Details:</strong><br />
                  {formValues.sellerName || "—"}<br />
                  {formValues.sellerAddress || "—"}<br />
                  PAN No.: {formValues.sellerPanNo || "—"}<br />
                  GST No.: {formValues.sellerGstNo || "—"}<br />
                  MSME No.: {formValues.sellerMsmeNo || "—"}
                </td>
                <td className="p-4 w-1/2 align-top">
                  <strong>Shipping Details:</strong><br />
                  {formValues.shipToName || "—"}<br />
                  {formValues.shippingAddress || "—"}<br />
                  PAN No.: {formValues.shipToPan || "—"}<br />
                  GST No.: {formValues.shipToGst || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Intro */}
      <p className="text-sm text-muted-foreground italic px-1">
        This is in reference to your offer and subsequent discussion with you.
        We are pleased to place this PO to your company {formValues.shipToName || "—"}
      </p>

      {/* Products Table */}
      <Card>
        <CardHeader className="py-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Items ({validProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/10">
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">#</th>
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Item Description</th>
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">HSN</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Rate</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground">GST%</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">GST Amt</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {validProducts.map((p, i) => (
                <ProductRow key={i} index={i} product={p} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/5 font-medium">
                <td colSpan={5} className="py-2 px-2 text-right text-sm">Total Amount</td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(subtotal)}</td>
                <td></td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(totalGst)}</td>
                <td className="py-2 px-2 text-right text-sm font-bold">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <p className="text-sm">
        <strong>Total Amount (In Words):</strong>{" "}
        {numberToWords(Math.round(grandTotal))}
      </p>

      {/* Terms & Conditions */}
      <SectionCard title="Terms & Conditions" icon={<ShieldCheck className="h-4 w-4" />}>
        {formValues.paymentTerms && <SummaryRow label="Payment Terms" value={formValues.paymentTerms} />}
        {formValues.freight && <SummaryRow label="Freight" value={formValues.freight} />}
        {formValues.transitInsurance && <SummaryRow label="Transit Insurance" value={formValues.transitInsurance} />}
        {formValues.preDispatchInspection && (
          <SummaryRow label="Pre-Dispatch Inspection" value={formValues.preDispatchInspection} />
        )}
        {formValues.warrantyDispatch && <SummaryRow label="Warranty" value={formValues.warrantyDispatch} />}
        {formValues.warrantyInstallation && (
          <SummaryRow label="Warranty (Installation)" value={formValues.warrantyInstallation} />
        )}
        {formValues.deliveryLocation && <SummaryRow label="Delivery Location" value={formValues.deliveryLocation} />}
        {formValues.technicalSpecifications && (
          <SummaryRow label="Technical Specifications" value={formValues.technicalSpecifications} />
        )}
        {formValues.deliveryPeriod && <SummaryRow label="Delivery Period" value={formValues.deliveryPeriod} />}
        {formValues.acceptanceOfOrder && <SummaryRow label="Acceptance of Order" value={formValues.acceptanceOfOrder} />}
        {formValues.documentation && <SummaryRow label="Documentation" value={formValues.documentation} />}
        {formValues.remarks && <SummaryRow label="Remarks" value={formValues.remarks} />}
      </SectionCard>

      {/* Terms from Additional Details */}
      <SectionCard title="Additional Details" icon={<FileText className="h-4 w-4" />}>
        {formValues.quotationNo && <SummaryRow label="Quotation No" value={formValues.quotationNo} />}
        {formValues.quotationDate && <SummaryRow label="Quotation Date" value={formValues.quotationDate} />}
        {formValues.materialUnloading && (
          <SummaryRow label="Material Unloading" value={formValues.materialUnloading} />
        )}
        {formValues.accessoriesPackagingList && (
          <SummaryRow label="Accessories / Packaging" value={formValues.accessoriesPackagingList} />
        )}
      </SectionCard>

      <Separator />

      {/* Footer disclaimer */}
      <p className="text-xs text-center text-muted-foreground">
        *** This is electronically generated document. It does not require any signature from M/s. Volks Energie Pvt. Ltd. ***
      </p>

      {/* Signature Area */}
      <div className="grid grid-cols-2 gap-8 pt-4">
        <div>
          <p className="text-sm">
            Read understood and unconditionally accepted for and on behalf of
          </p>
          <p className="text-sm font-medium mt-1">For M/s Volks Energie Pvt Ltd</p>
          <div className="mt-12 border-t border-dashed pt-1">
            <p className="text-xs text-muted-foreground">Authorized Signatory</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">For M/s {formValues.sellerName || "—"}</p>
          <div className="mt-16 border-t border-dashed pt-1">
            <p className="text-xs text-muted-foreground">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Edit
        </Button>

        <Button onClick={onSubmit} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Receipt className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Creating PO..." : "Create PO"}
        </Button>
      </div>
    </div>
  );
}
