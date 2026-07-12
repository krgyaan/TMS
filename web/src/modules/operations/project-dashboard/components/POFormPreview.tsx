import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/hooks/useFormatedDate";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Receipt,
} from "lucide-react";
import { calculateTotals, formatINR } from "../helpers/projectDashboard.mapper";
import type { ProductFormItem, PurchaseOrderFormValues } from "../helpers/purchaseOrder.schema";

function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertBelow1000 = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertBelow1000(n % 100) : "");
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  const crore = Math.floor(wholePart / 10000000);
  const lakh = Math.floor((wholePart % 10000000) / 100000);
  const thousand = Math.floor((wholePart % 100000) / 1000);
  const remainder = wholePart % 1000;

  let result = "";
  if (crore) result += convertBelow1000(crore) + " Crore ";
  if (lakh) result += convertBelow1000(lakh) + " Lakh ";
  if (thousand) result += convertBelow1000(thousand) + " Thousand ";
  if (remainder) result += convertBelow1000(remainder);

  if (decimalPart > 0) {
    result += " and " + convertBelow1000(decimalPart) + " Paise";
  }

  return result.trim() + " Only";
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
      <td className="py-2 px-2 text-sm text-right">{formatINR(rate)}</td>
      <td className="py-2 px-2 text-sm text-right">{formatINR(amount)}</td>
      <td className="py-2 px-2 text-sm text-center">{product.gstRate}%</td>
      <td className="py-2 px-2 text-sm text-right">{formatINR(gstAmount)}</td>
      <td className="py-2 px-2 text-sm text-right font-medium">{formatINR(total)}</td>
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
  teamMembers?: any[];
}

export function POFormPreview({
  formValues,
  projectName,
  nextPONumber,
  isSubmitting,
  onBack,
  onSubmit,
  teamMembers,
}: POFormPreviewProps) {
  const certRecipientEmails = (formValues.selectedCertRecipients || [])
    .map((id: string) => teamMembers?.find((u: any) => String(u.id) === id))
    .filter(Boolean)
    .map((u: any) => u.email)
    .filter(Boolean)
    .join(", ") || "goyal@volksenergie.in";

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

      <div className="flex items-center gap-2 mb-2">
        <Badge variant={formValues.poType === "pi" ? "default" : "secondary"}>
          {formValues.poType === "pi" ? "PI Based" : "New PO"}
        </Badge>
        {formValues.poType === "pi" && formValues.piAttachments.length > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {formValues.piAttachments.length} invoice file{formValues.piAttachments.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="py-3 border-b bg-muted/20">
          <CardTitle className="text-center text-base font-bold">
            PURCHASE ORDER
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Company Header Table */}
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
                  New Delhi - 110044<br />
                  Mob: +91 9650393636<br />
                  email: goyal@volksenergie.in<br />
                  PAN No.: AADCV9396C<br />
                  GST No.: 07AADCV9396C1Z
                </td>
                <td className="p-4 w-2/5 align-top">
                  <strong>Date:</strong> {formatDate(formValues.poDate) || "—"}<br />
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

          {/* Intro */}
          <p className="text-sm text-muted-foreground italic px-4 py-3">
            This is in reference to your offer and subsequent discussion with you.
            We are pleased to place this PO to your company {formValues.shipToName || "—"}
          </p>

          {/* Items Table */}
          <div className="border-t">
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Sr. No</th>
                    <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Item Description</th>
                    <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">HSN</th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Quantity</th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Rate (Rs.)</th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground">GST Rate</th>
                    <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">GST Amount</th>
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
                    <td className="py-2 px-2 text-right text-sm">{formatINR(subtotal)}</td>
                    <td></td>
                    <td className="py-2 px-2 text-right text-sm">{formatINR(totalGst)}</td>
                    <td className="py-2 px-2 text-right text-sm font-bold">{formatINR(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Total Amount in Words */}
          <p className="text-sm px-4 py-3 border-t">
            <strong>Total Amount (In Words):</strong>{" "}
            {numberToWords(grandTotal)}
          </p>

          {/* Test Certificate Email */}
          <p className="text-sm px-4 py-3 border-t">
            Test certificate and invoice with machine serial no. need to be shared on {certRecipientEmails}
          </p>

          {/* Terms & Conditions */}
          <div className="px-4 py-3 border-t">
            <strong>Terms and conditions:</strong><br />
            {formValues.termsAndConditions?.map((term, i) =>
              term.value ? (
                <span key={i}>
                  <b>{term.field}:</b> {term.value}.<br />
                </span>
              ) : null
            )}
          </div>

          {/* Additional Details inline */}
          {(formValues.quotationNo || formValues.quotationDate || formValues.remarks) && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              {formValues.quotationNo && <span><strong>Quotation No:</strong> {formValues.quotationNo}<br /></span>}
              {formValues.quotationDate && <span><strong>Quotation Date:</strong> {formValues.quotationDate}<br /></span>}
              {formValues.remarks && <span><strong>Remarks:</strong> {formValues.remarks}<br /></span>}
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="text-xs text-center text-muted-foreground px-4 py-3 border-t">
            *** This is electronically generated document. It does not require any signature from M/s. Volks Energie Pvt. Ltd. ***
          </p>

          {/* Signature Area */}
          <p className="text-center text-sm">
            Read understood and unconditionally accepted for and on behalf of
          </p>
          <div className="grid grid-cols-2 gap-8 px-4 py-6">
            <div className="text-left">
              <p className="text-sm font-medium mt-1">For M/s Volks Energie Pvt Ltd</p>
              <div className="mt-12">
                <p className="text-xs text-muted-foreground">Authorized Signatory</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">For M/s {formValues.sellerName || "—"}</p>
              <div className="mt-16">
                <p className="text-xs text-muted-foreground">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
