import { paths } from "@/app/routes/paths";
import { FileUploader } from "@/components/file-upload";
import { DateInput } from "@/components/form/DateInput";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateWoBasicDetailBatch, useWoBasicDetailPrefill, useWoBasicDetailsByTender } from "@/hooks/api/useWoBasicDetails";
import { formatINR } from "@/hooks/useINRFormatter";
import type { CreateWoBasicDetailBatchDto, CreateWoBasicDetailBatchOrderDto } from "@/modules/operations/types/wo.types";
import { ArrowLeft, ArrowRight, Plus, Save, SkipForward, Trash2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { GEM_REQUEST_OPTIONS, NATURE_OPTIONS, PO_RECEIVED_OPTIONS, TEAM_ARRAY, TMS_DOCS } from "../helpers/basiDetailBatch.constants";
import { computeGemChargesBreakdown, GEM_GST_RATE, GEM_TDS_RATE } from "../helpers/gemCharges";
import type { BasicDetailBatchFormValues, BasicDetailOrderType, ContactRow, OrderDefaults, OrderRow } from "../helpers/basiDetailBatch.types";

const emptyContact = (): ContactRow => ({
    name: "",
    designation: "",
    phones: [""],
    email: "",
    organization: "",
    departments: "",
});

const emptyOrder = (contacts: ContactRow[] = [], defaults: OrderDefaults = {}): OrderRow => ({
    woNumber: "",
    woDate: null,
    woValuePreGst: "",
    woValueGstAmt: "",
    orderNature: "",
    poReceivedStatus: "",
    sapPoUpload: [],
    woDraft: [],
    budgetPreGst: defaults.budgetPreGst ?? "",
    receiptPreGst: defaults.receiptPreGst ?? "",
    finalPrice: defaults.finalPrice ?? "",
    budgetSupply: "",
    budgetService: "",
    budgetFreight: "",
    budgetAdmin: "",
    budgetBuybackSale: "",
    requestGemCharges: defaults.requestGemCharges ?? "",
    gemChargesAmount: "",
    gemChargesPortalLink: "",
    gemChargesInvoice: [],
    contacts: contacts.length ? contacts.map((contact) => ({ ...contact })) : [],
});

const financialYear = (date: Date): string => {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fy = month >= 4 ? year : year - 1;
    const short = String(fy).slice(-2);
    return `${short}${(Number(short) + 1).toString().padStart(2, "0")}`;
};

const num = (value: string | number | undefined): number => Number(value || 0);

export function BasicDetailBatchForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenderId = Number(searchParams.get("tenderId") || 0);
    const returnTo = paths.operations.woBasicDetailListPage;

    const { data: prefillData } = useWoBasicDetailPrefill(tenderId || null);
    const { data: existingOrders = [] } = useWoBasicDetailsByTender(tenderId || 0);
    const createBatch = useCreateWoBasicDetailBatch();

    const startSequence =
        existingOrders.reduce((max, order) => Math.max(max, order.orderSequence ?? 0), 0) + 1;
    const hasExistingOrders = existingOrders.length > 0;

    const [orderType, setOrderType] = useState<BasicDetailOrderType>(
        hasExistingOrders ? "repeat" : "single",
    );
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [activeOrder, setActiveOrder] = useState(0);
    const form = useForm<BasicDetailBatchFormValues>({
        defaultValues: { orders: [emptyOrder()] },
    });
    const rows = form.watch("orders");
    const setRows = useCallback((updater: (previous: OrderRow[]) => OrderRow[]) => {
        form.setValue("orders", updater(form.getValues("orders")), { shouldDirty: true });
    }, [form]);
    const [tmsDocuments, setTmsDocuments] = useState<Record<string, boolean>>(
        Object.fromEntries(TMS_DOCS.map(doc => [doc, false])),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const tenderContacts = useMemo<ContactRow[]>(() => {
        return (prefillData?.clients ?? []).map(client => ({
            name: client.clientName ?? "",
            designation: client.clientDesignation ?? "",
            phones: client.clientMobile ? [client.clientMobile] : [""],
            email: client.clientEmail ?? "",
            organization: "",
            departments: "",
        }));
    }, [prefillData]);

    const isGemTender = Boolean(prefillData?.isGemTender);

    const orderDefaults = useMemo<OrderDefaults>(() => ({
        budgetPreGst: prefillData?.budgetPrice ?? "",
        receiptPreGst: prefillData?.receiptPrice ?? "",
        finalPrice: prefillData?.finalPrice ?? "",
        requestGemCharges: prefillData?.isGemTender ? "true" : "false",
    }), [prefillData]);

    useEffect(() => {
        if (!prefillData) return;
        setRows(prev => prev.map(row => ({
            ...row,
            budgetPreGst: row.budgetPreGst || (prefillData.budgetPrice ?? ""),
            receiptPreGst: row.receiptPreGst || (prefillData.receiptPrice ?? ""),
            finalPrice: row.finalPrice || (prefillData.finalPrice ?? ""),
            requestGemCharges: row.requestGemCharges || (prefillData.isGemTender ? "true" : "false"),
        })));
    }, [prefillData, setRows]);

    useEffect(() => {
        rows.forEach((row, index) => {
            if (row.poReceivedStatus !== "received" && row.sapPoUpload.length > 0) {
                form.setValue(`orders.${index}.sapPoUpload`, [], { shouldDirty: true });
            }
        });
    }, [rows, form]);

    useEffect(() => {
        rows.forEach((row, index) => {
            if (
                row.requestGemCharges !== "true" &&
                (row.gemChargesAmount || row.gemChargesPortalLink || row.gemChargesInvoice.length > 0)
            ) {
                form.setValue(`orders.${index}.gemChargesAmount`, "", { shouldDirty: true });
                form.setValue(`orders.${index}.gemChargesPortalLink`, "", { shouldDirty: true });
                form.setValue(`orders.${index}.gemChargesInvoice`, [], { shouldDirty: true });
            }
        });
    }, [rows, form]);

    const projectIdentifiers = (row: OrderRow, index: number) => {
        if (!prefillData) return { code: "", name: "" };

        const teamName = TEAM_ARRAY.find(team => team.id === prefillData.team)?.name || "";
        const orgName = prefillData.organizationAcronym || "";
        const itemName = prefillData.itemName || "";
        const locationName = prefillData.locationName || "";
        const woSuffix = row.woNumber ? row.woNumber.slice(-4) : "";
        const yearSegment = row.woDate ? financialYear(row.woDate) : "";

        if (!teamName || !orgName || !itemName || !locationName || !woSuffix || !yearSegment) {
            return { code: "", name: "" };
        }

        const sequence = startSequence + index;
        const suffix =
            sequence <= 1 ? "" :
            orderType === "repeat" ? `(R${sequence})` :
            orderType === "multiple" ? `(P${sequence})` : "";
        const baseCode = `${teamName}/${yearSegment}/${orgName}/${locationName}/${itemName}/${woSuffix}`;
        const baseName = `${orgName} ${locationName} ${itemName}`.trim();

        return {
            code: suffix ? `${baseCode} ${suffix}` : baseCode,
            name: suffix ? `${baseName} ${suffix}` : baseName,
        };
    };

    const updateRow = (index: number, patch: Partial<OrderRow>) => {
        setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const recalculatedBudget = (row: OrderRow) => {
        const total =
            num(row.budgetSupply) +
            num(row.budgetService) +
            num(row.budgetFreight) +
            num(row.budgetAdmin) +
            num(row.gemChargesAmount) -
            num(row.budgetBuybackSale);
        return total;
    };

    const updateBudgetField = (index: number, field: keyof OrderRow, value: string) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== index) return row;
            const next = { ...row, [field]: value } as OrderRow;
            const hasBreakdown = [
                next.budgetSupply,
                next.budgetService,
                next.budgetFreight,
                next.budgetAdmin,
                next.budgetBuybackSale,
                next.gemChargesAmount,
            ].some(v => num(v) > 0);
            if (hasBreakdown) next.budgetPreGst = String(recalculatedBudget(next));
            return next;
        }));
    };

    const addRow = () => {
        setRows(prev => [
            ...prev,
            emptyOrder(tenderContacts.length ? tenderContacts : [emptyContact()], orderDefaults),
        ]);
    };

    const removeRow = (index: number) => {
        setRows(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
        setActiveOrder(prev => Math.max(0, Math.min(prev, rows.length - 2)));
    };

    const updateContact = (orderIndex: number, contactIndex: number, patch: Partial<ContactRow>) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== orderIndex) return row;
            const contacts = row.contacts.map((contact, ci) => (ci === contactIndex ? { ...contact, ...patch } : contact));
            return { ...row, contacts };
        }));
    };

    const addContact = (orderIndex: number) => {
        setRows(prev => prev.map((row, i) => (i === orderIndex ? { ...row, contacts: [...row.contacts, emptyContact()] } : row)));
    };

    const removeContact = (orderIndex: number, contactIndex: number) => {
        setRows(prev => prev.map((row, i) => (
            i === orderIndex
                ? { ...row, contacts: row.contacts.filter((_, ci) => ci !== contactIndex) }
                : row
        )));
    };

    const prefillTenderContacts = (orderIndex: number) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== orderIndex) return row;
            const existing = new Set(row.contacts.map(contact => `${contact.name}|${contact.email}|${contact.phones.join(",")}`));
            const additions = tenderContacts.filter(contact => !existing.has(`${contact.name}|${contact.email}|${contact.phones.join(",")}`));
            return { ...row, contacts: [...row.contacts, ...additions.map(contact => ({ ...contact }))] };
        }));
    };

    const updateContactPhone = (orderIndex: number, contactIndex: number, phoneIndex: number, value: string) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== orderIndex) return row;
            const contacts = row.contacts.map((contact, ci) => {
                if (ci !== contactIndex) return contact;
                const phones = [...contact.phones];
                phones[phoneIndex] = value;
                return { ...contact, phones };
            });
            return { ...row, contacts };
        }));
    };

    const addContactPhone = (orderIndex: number, contactIndex: number) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== orderIndex) return row;
            const contacts = row.contacts.map((contact, ci) => (
                ci === contactIndex ? { ...contact, phones: [...contact.phones, ""] } : contact
            ));
            return { ...row, contacts };
        }));
    };

    const removeContactPhone = (orderIndex: number, contactIndex: number, phoneIndex: number) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== orderIndex) return row;
            const contacts = row.contacts.map((contact, ci) => {
                if (ci !== contactIndex) return contact;
                const phones = contact.phones.filter((_, pi) => pi !== phoneIndex);
                return { ...contact, phones: phones.length ? phones : [""] };
            });
            return { ...row, contacts };
        }));
    };

    const applyOrderType = (value: BasicDetailOrderType) => {
        setOrderType(value);
        if (value === "single") {
            setRows(prev => prev.slice(0, 1));
            setActiveOrder(0);
        }
    };

    const validateStep1 = () => {
        const nextErrors: Record<string, string> = {};
        rows.forEach((row, index) => {
            if (!row.woNumber.trim()) nextErrors[`${index}.woNumber`] = "Required";
            if (!row.woDate) nextErrors[`${index}.woDate`] = "Required";
            if (!(num(row.woValuePreGst) > 0)) nextErrors[`${index}.woValuePreGst`] = "Required";
            if (!(num(row.woValueGstAmt) > 0)) nextErrors[`${index}.woValueGstAmt`] = "Required";
            if (!row.orderNature) nextErrors[`${index}.orderNature`] = "Required";
            if (!row.poReceivedStatus) nextErrors[`${index}.poReceivedStatus`] = "Required";
            if (row.poReceivedStatus === "received" && row.sapPoUpload.length === 0) {
                nextErrors[`${index}.sapPoUpload`] = "Upload at least one SAP PO file";
            }
            if (row.woDraft.length === 0) nextErrors[`${index}.woDraft`] = "Upload at least one file";
        });
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const validateGem = () => {
        const nextErrors: Record<string, string> = {};
        rows.forEach((row, index) => {
            if (row.requestGemCharges !== "true") return;
            if (row.gemChargesAmount.trim() === "") {
                nextErrors[`${index}.gemChargesAmount`] = "Required (enter 0 if not applicable)";
            } else if (Number(row.gemChargesAmount) > 0 && !row.gemChargesPortalLink.trim()) {
                nextErrors[`${index}.gemChargesPortalLink`] = "Portal link is required when GeM charges are greater than 0";
            }
        });
        setErrors(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (key.endsWith(".gemChargesAmount") || key.endsWith(".gemChargesPortalLink")) {
                    delete next[key];
                }
            });
            return { ...next, ...nextErrors };
        });
        return Object.keys(nextErrors).length === 0;
    };

    const goNext = () => {
        setErrors({});
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateGem()) return;
        setStep(prev => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const goBack = () => {
        setStep(prev => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const submit = async () => {
        const step1Valid = validateStep1();
        if (!step1Valid) {
            setStep(1);
            return;
        }
        if (!validateGem()) {
            setStep(2);
            return;
        }

        if (!prefillData) {
            toast.error("Tender details are still loading. Please try again.");
            return;
        }

        const missingIdentifiers = rows.findIndex((row, index) => {
            const identifiers = projectIdentifiers(row, index);
            return !identifiers.code || !identifiers.name;
        });
        if (missingIdentifiers >= 0) {
            toast.error(`Project code/name could not be generated for row ${missingIdentifiers + 1}. Check the WO number and date.`);
            setStep(1);
            return;
        }

        const payload: CreateWoBasicDetailBatchDto = {
            tenderId,
            orderType,
            tmsDocuments,
            orders: rows.map((row, index) => {
                const identifiers = projectIdentifiers(row, index);
                const order: CreateWoBasicDetailBatchOrderDto = {
                    woNumber: row.woNumber,
                    woDate: row.woDate!.toISOString().split("T")[0],
                    woValuePreGst: row.woValuePreGst,
                    woValueGstAmt: row.woValueGstAmt,
                    projectCode: identifiers.code,
                    projectName: identifiers.name,
                    orderNature: row.orderNature as "supply" | "service" | "sitc",
                    poReceivedStatus: row.poReceivedStatus as "received" | "not_received" | "not_applicable",
                    budgetPreGst: row.budgetPreGst || undefined,
                    receiptPreGst: row.receiptPreGst || undefined,
                    finalPrice: row.finalPrice || undefined,
                    budgetSupply: row.budgetSupply || undefined,
                    budgetService: row.budgetService || undefined,
                    budgetFreight: row.budgetFreight || undefined,
                    budgetAdmin: row.budgetAdmin || undefined,
                    budgetBuybackSale: row.budgetBuybackSale || undefined,
                    requestGemCharges: row.requestGemCharges === "true",
                    gemChargesAmount: row.requestGemCharges === "true"
                        ? (row.gemChargesAmount === "" ? undefined : Number(row.gemChargesAmount))
                        : undefined,
                    gemChargesPortalLink: row.requestGemCharges === "true" ? (row.gemChargesPortalLink || undefined) : undefined,
                    contacts: row.contacts
                        .filter(contact => contact.name || contact.email || contact.phones.some(Boolean))
                        .map(contact => ({
                            name: contact.name || undefined,
                            designation: contact.designation || undefined,
                            phones: contact.phones.filter(Boolean),
                            email: contact.email || undefined,
                            organization: contact.organization || undefined,
                            departments: contact.departments || undefined,
                        })),
                };
                if (row.woDraft.length) order.woDraft = JSON.stringify(row.woDraft);
                if (row.poReceivedStatus === "received" && row.sapPoUpload.length) {
                    order.sapPoUpload = JSON.stringify(row.sapPoUpload);
                }
                if (row.requestGemCharges === "true" && row.gemChargesInvoice.length) {
                    order.gemChargesInvoice = JSON.stringify(row.gemChargesInvoice);
                }
                return order;
            }),
        };

        try {
            await createBatch.mutateAsync(payload);
            navigate(returnTo);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create work orders");
        }
    };

    const activeRow = rows[activeOrder] ?? rows[0];
    const activeIdentifiers = activeRow ? projectIdentifiers(activeRow, activeOrder) : { code: "", name: "" };
    const activeGemBreakdown = useMemo(
        () => computeGemChargesBreakdown(activeRow?.gemChargesAmount),
        [activeRow?.gemChargesAmount],
    );

    return (
        <Form {...form}>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>Create Basic Details</CardTitle>
                        <CardDescription className="mt-2">
                            Enter one or more orders for this won tender.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 1, title: "Orders & Documents" },
                        { id: 2, title: "Costs & Budget" },
                        { id: 3, title: "Contacts" },
                    ].map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setStep(item.id as 1 | 2 | 3)}
                            className={`rounded-lg border p-3 text-left ${step === item.id ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                        >
                            <span className="block text-xs text-muted-foreground">Step {item.id}</span>
                            <span className="text-sm font-semibold">{item.title}</span>
                        </button>
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border bg-muted/50 p-4 md:grid-cols-2 lg:grid-cols-4">
                            {TMS_DOCS.map(doc => (
                                <label key={doc} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={tmsDocuments[doc] ?? false}
                                        onCheckedChange={value => setTmsDocuments(prev => ({ ...prev, [doc]: Boolean(value) }))}
                                    />
                                    {doc}
                                </label>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(hasExistingOrders ? ["repeat", "multiple"] : ["single", "repeat", "multiple"]).map(type => (
                                <Button
                                    key={type}
                                    type="button"
                                    variant={orderType === type ? "default" : "outline"}
                                    onClick={() => applyOrderType(type as BasicDetailOrderType)}
                                >
                                    {type === "single" ? "Single" : type === "repeat" ? "Repeat" : "Multiple"}
                                </Button>
                            ))}
                            <Badge variant="secondary">Separate tracking</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-lg font-semibold">Orders</h3>
                                <p className="text-sm text-muted-foreground">
                                    {orderType === "single"
                                        ? "One order for this tender."
                                        : "Add each repeated or multiple order as a separate project."}
                                </p>
                            </div>
                            {orderType !== "single" && (
                                <Button type="button" variant="outline" onClick={addRow}>
                                    <Plus className="mr-2 h-4 w-4" /> Add More
                                </Button>
                            )}
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">#</TableHead>
                                        <TableHead>WO Number</TableHead>
                                        <TableHead>WO Date</TableHead>
                                        <TableHead>WO Value (pre GST)</TableHead>
                                        <TableHead>GST Amt.</TableHead>
                                        <TableHead className="min-w-[240px]">Project</TableHead>
                                        <TableHead className="w-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, index) => {
                                        const identifiers = projectIdentifiers(row, index);
                                        const sequence = startSequence + index;
                                        const label = orderLabel(orderType, sequence);
                                        return (
                                            <Fragment key={index}>
                                                <TableRow className="border-b-0">
                                                    <TableCell rowSpan={2} className="align-top text-sm font-semibold">{label}</TableCell>
                                                    <TableCell className="align-top">
                                                        <Input
                                                            value={row.woNumber}
                                                            onChange={event => updateRow(index, { woNumber: event.target.value })}
                                                            placeholder="WO number"
                                                        />
                                                        {errors[`${index}.woNumber`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.woNumber`]}</p>}
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[150px]">
                                                        <DateInput
                                                            value={row.woDate ? row.woDate.toISOString().split("T")[0] : ""}
                                                            onChange={value => updateRow(index, { woDate: value ? new Date(value) : null })}
                                                        />
                                                        {errors[`${index}.woDate`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.woDate`]}</p>}
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[130px]">
                                                        <Input type="number" step="0.01" value={row.woValuePreGst} onChange={event => updateRow(index, { woValuePreGst: event.target.value })} />
                                                        {errors[`${index}.woValuePreGst`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.woValuePreGst`]}</p>}
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[130px]">
                                                        <Input type="number" step="0.01" value={row.woValueGstAmt} onChange={event => updateRow(index, { woValueGstAmt: event.target.value })} />
                                                        {errors[`${index}.woValueGstAmt`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.woValueGstAmt`]}</p>}
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[240px]">
                                                        <div className="space-y-1">
                                                            <p className="break-all font-mono text-xs">{identifiers.code || "—"}</p>
                                                            <p className="text-xs text-muted-foreground">{identifiers.name || "—"}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell rowSpan={2} className="align-top">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={rows.length === 1}
                                                            onClick={() => removeRow(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow className="border-b bg-muted/10">
                                                    <TableCell className="align-top">
                                                        <SelectField
                                                            control={form.control}
                                                            name={`orders.${index}.orderNature`}
                                                            label="Nature"
                                                            options={NATURE_OPTIONS}
                                                            placeholder="Select nature"
                                                            valueType="string"
                                                        />
                                                        {errors[`${index}.orderNature`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.orderNature`]}</p>}
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <div className="space-y-2">
                                                            <SelectField
                                                                control={form.control}
                                                                name={`orders.${index}.poReceivedStatus`}
                                                                label="PO Received"
                                                                options={PO_RECEIVED_OPTIONS}
                                                                placeholder="Select PO status"
                                                                valueType="string"
                                                            />
                                                            {errors[`${index}.poReceivedStatus`] && <p className="text-xs text-destructive">{errors[`${index}.poReceivedStatus`]}</p>}
                                                        </div>
                                                    </TableCell>
                                                    {row.poReceivedStatus === "received" && (
                                                        <TableCell className="align-top min-w-[220px]">
                                                            <FileUploader
                                                                context="sap-po"
                                                                value={row.sapPoUpload}
                                                                onChange={files => updateRow(index, { sapPoUpload: files })}
                                                            />
                                                            {errors[`${index}.sapPoUpload`] && <p className="text-xs text-destructive">{errors[`${index}.sapPoUpload`]}</p>}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="align-top min-w-[220px]">
                                                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Draft WO</p>
                                                        <FileUploader
                                                            context="wo-draft"
                                                            value={row.woDraft}
                                                            onChange={files => updateRow(index, { woDraft: files })}
                                                        />
                                                        {errors[`${index}.woDraft`] && <p className="mt-1 text-xs text-destructive">{errors[`${index}.woDraft`]}</p>}
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                            <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(2); }}>
                                <SkipForward className="mr-2 h-4 w-4" /> Skip to costs
                            </Button>
                            <Button type="button" onClick={goNext}>
                                Next: Costs <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5">
                        <OrderTabs rows={rows} active={activeOrder} onChange={setActiveOrder} orderType={orderType} startSequence={startSequence} />
                        {activeRow && (
                            <div className="space-y-5 p-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Costs & Budget — {projectLabel(orderType, startSequence + activeOrder)}</h3>
                                    <p className="text-sm text-muted-foreground">{activeIdentifiers.name || "Project name pending"}</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-5">
                                    <LabeledNumber label="Budget (Pre-GST)" value={activeRow.budgetPreGst} onChange={value => updateRow(activeOrder, { budgetPreGst: value })} />
                                    <LabeledNumber label="Receipt (Pre-GST)" value={activeRow.receiptPreGst} onChange={value => updateRow(activeOrder, { receiptPreGst: value })} />
                                    <LabeledNumber label="Final Price" value={activeRow.finalPrice} onChange={value => updateRow(activeOrder, { finalPrice: value })} />
                                </div>
                                <div>
                                    <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Budget Breakdown</h4>
                                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                                        <LabeledNumber label="Supply" value={activeRow.budgetSupply} onChange={value => updateBudgetField(activeOrder, "budgetSupply", value)} />
                                        <LabeledNumber label="Service" value={activeRow.budgetService} onChange={value => updateBudgetField(activeOrder, "budgetService", value)} />
                                        <LabeledNumber label="Freight" value={activeRow.budgetFreight} onChange={value => updateBudgetField(activeOrder, "budgetFreight", value)} />
                                        <LabeledNumber label="Admin" value={activeRow.budgetAdmin} onChange={value => updateBudgetField(activeOrder, "budgetAdmin", value)} />
                                        <LabeledNumber label="Buyback Sale" value={activeRow.budgetBuybackSale} onChange={value => updateBudgetField(activeOrder, "budgetBuybackSale", value)} />
                                    </div>
                                </div>
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <SelectField
                                            control={form.control}
                                            name={`orders.${activeOrder}.requestGemCharges`}
                                            label="Request GeM Charges Payment"
                                            options={GEM_REQUEST_OPTIONS}
                                            placeholder="Select"
                                            valueType="string"
                                            descriptionPlacement="below"
                                        />
                                    </div>
                                    {isGemTender && (
                                        <p className="text-xs text-muted-foreground">
                                            This tender was bid on GeM. GeM charges payment request is enabled by default; enter 0 if not applicable.
                                        </p>
                                    )}
                                    {activeRow.requestGemCharges === "true" && (
                                        <div className="grid gap-4 md:grid-cols-4">
                                            <div className="space-y-1">
                                                <LabeledNumber
                                                    label={isGemTender ? "GeM Charges (Pre-GST) *" : "GeM Charges (Pre-GST)"}
                                                    value={activeRow.gemChargesAmount}
                                                    onChange={value => updateBudgetField(activeOrder, "gemChargesAmount", value)}
                                                />
                                                {errors[`${activeOrder}.gemChargesAmount`] && (
                                                    <p className="text-xs text-destructive">{errors[`${activeOrder}.gemChargesAmount`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <LabeledText label="GeM Portal Link" value={activeRow.gemChargesPortalLink} onChange={value => updateRow(activeOrder, { gemChargesPortalLink: value })} />
                                                {errors[`${activeOrder}.gemChargesPortalLink`] && (
                                                    <p className="text-xs text-destructive">{errors[`${activeOrder}.gemChargesPortalLink`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">GeM Invoice</p>
                                                <FileUploader
                                                    context="wo-draft"
                                                    value={activeRow.gemChargesInvoice}
                                                    onChange={files => updateRow(activeOrder, { gemChargesInvoice: files })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {activeRow.requestGemCharges === "true" && (
                                        <div className="space-y-2">
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border p-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">GST @ {GEM_GST_RATE}%</p>
                                                    <p>{formatINR(activeGemBreakdown.gstAmount)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">Total Payable</p>
                                                    <p>{formatINR(activeGemBreakdown.totalPayable)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">TDS @ {GEM_TDS_RATE}%</p>
                                                    <p className="text-destructive">-{formatINR(activeGemBreakdown.tdsAmount)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">Net Payable</p>
                                                    <p className="text-emerald-600">{formatINR(activeGemBreakdown.netPayable)}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                The maker request will be auto-created for the Net Payable amount ({formatINR(activeGemBreakdown.netPayable)}).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-between gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={goBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(3); }}>
                                    <SkipForward className="mr-2 h-4 w-4" /> Skip to contacts
                                </Button>
                                <Button type="button" onClick={goNext}>
                                    Next: Contacts <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-5">
                        <OrderTabs rows={rows} active={activeOrder} onChange={setActiveOrder} orderType={orderType} startSequence={startSequence} />
                        {activeRow && (
                            <div className="space-y-4 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">Contacts — {projectLabel(orderType, startSequence + activeOrder)}</h3>
                                        <p className="text-sm text-muted-foreground">{activeRow.contacts.length} contact(s)</p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addContact(activeOrder)}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Contact
                                    </Button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Designation</TableHead>
                                                <TableHead>Phone Numbers</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead className="w-14" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeRow.contacts.map((contact, contactIndex) => (
                                                <TableRow key={contactIndex}>
                                                    <TableCell className="align-top text-sm text-muted-foreground">{contactIndex + 1}</TableCell>
                                                    <TableCell className="align-top min-w-[150px]">
                                                        <Input value={contact.name} onChange={event => updateContact(activeOrder, contactIndex, { name: event.target.value })} placeholder="Name" />
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[150px]">
                                                        <Input value={contact.designation} onChange={event => updateContact(activeOrder, contactIndex, { designation: event.target.value })} placeholder="Designation" />
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[200px]">
                                                        <div className="space-y-2">
                                                            {contact.phones.map((phone, phoneIndex) => (
                                                                <div key={phoneIndex} className="flex items-center gap-1">
                                                                    <Input
                                                                        value={phone}
                                                                        onChange={event => updateContactPhone(activeOrder, contactIndex, phoneIndex, event.target.value)}
                                                                        placeholder={phoneIndex === 0 ? "Primary phone" : "Additional phone"}
                                                                    />
                                                                    {contact.phones.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 shrink-0"
                                                                            onClick={() => removeContactPhone(activeOrder, contactIndex, phoneIndex)}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="button"
                                                                variant="link"
                                                                size="sm"
                                                                className="h-auto p-0 text-xs"
                                                                onClick={() => addContactPhone(activeOrder, contactIndex)}
                                                            >
                                                                + Add number
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top min-w-[200px]">
                                                        <Input type="email" value={contact.email} onChange={event => updateContact(activeOrder, contactIndex, { email: event.target.value })} placeholder="Email" />
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(activeOrder, contactIndex)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {activeRow.contacts.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                                                        No contacts added for this order yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {tenderContacts.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => prefillTenderContacts(activeOrder)}
                                    >
                                        Prefill from tender contacts
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap justify-between gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={goBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button type="button" onClick={submit} disabled={createBatch.isPending}>
                                <Save className="mr-2 h-4 w-4" />
                                {createBatch.isPending ? "Saving..." : `Create ${rows.length} order(s)`}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        </Form>
    );
}

function orderLabel(orderType: BasicDetailOrderType, sequence: number) {
    if (sequence <= 1) return orderType === "single" ? "Single" : "Order 1";
    if (orderType === "repeat") return `R${sequence}`;
    if (orderType === "multiple") return `P${sequence}`;
    return "Single";
}

function projectLabel(orderType: BasicDetailOrderType, sequence: number) {
    return orderLabel(orderType, sequence);
}

function OrderTabs({
    rows,
    active,
    onChange,
    orderType,
    startSequence,
}: {
    rows: OrderRow[];
    active: number;
    onChange: (index: number) => void;
    orderType: BasicDetailOrderType;
    startSequence: number;
}) {
    if (rows.length <= 1) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {rows.map((row, index) => (
                <Button
                    key={index}
                    type="button"
                    size="sm"
                    variant={active === index ? "default" : "outline"}
                    onClick={() => onChange(index)}
                >
                    {projectLabel(orderType, startSequence + index)} · {row.woNumber || "New order"}
                </Button>
            ))}
        </div>
    );
}

function LabeledNumber({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="space-y-1">
            <span className="text-sm font-medium">{label}</span>
            <Input type="number" step="0.01" value={value} onChange={event => onChange(event.target.value)} placeholder="0.00" />
        </label>
    );
}

function LabeledText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="space-y-1">
            <span className="text-sm font-medium">{label}</span>
            <Input value={value} onChange={event => onChange(event.target.value)} />
        </label>
    );
}

export default BasicDetailBatchForm;
