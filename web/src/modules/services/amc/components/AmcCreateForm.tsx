import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import {
    Plus, Save, Upload, Loader2,
    MapPin, Package, Wrench, FileText, BadgeDollarSign,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField, Combobox } from "@/components/form/SelectField";
import { paths } from "@/app/routes/paths";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useItems } from "@/hooks/api/useItems";
import {
    useAmc, useCreateAmc, useUpdateAmc, useAmcFileUpload,
} from "@/hooks/api/useAmc";
import {
    AmcFormSchema,
    amcFormDefaultValues,
    TEAM_OPTIONS,
    BILL_TYPE_OPTIONS,
    SERVICE_FREQUENCY_OPTIONS,
    BILL_FREQUENCY_OPTIONS,
    type AmcFormValues,
    type AmcSite,
    type AmcSiteContact,
    type AmcProduct,
    type AmcServiceEngineer,
    type CreateAmcDto,
} from "../helpers/amc.types";

const inputCls =
    "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent " +
    "px-3 py-1 text-sm outline-none focus-visible:border-ring " +
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const sectionCls = "py-6 px-6 border-b last:border-b-0";
const sectionHeaderCls = "flex items-center justify-between mb-4";
const sectionTitleCls = "text-sm font-semibold flex items-center gap-2 text-foreground";

// ── helpers ──────────────────────────────────────────────────────────────────

interface RowProps<T> {
    value: T;
    onChange: (v: T) => void;
    onRemove: () => void;
    removable?: boolean;
}

// ── Site ─────────────────────────────────────────────────────────────────────

function SiteRow({ value, onChange, onRemove, removable = true }: RowProps<AmcSite>) {
    const set = (patch: Partial<AmcSite>) => onChange({ ...value, ...patch });
    return (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Site
                </span>
                {removable && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={onRemove}
                    >
                        Remove
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Name
                    </label>
                    <Input
                        className={inputCls}
                        placeholder="Site Name"
                        value={value.name}
                        onChange={e => set({ name: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                         Address
                    </label>
                    <Input
                        className={inputCls}
                        placeholder="Site Address"
                        value={value.address}
                        onChange={e => set({ address: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Location (Google Map) Link
                    </label>
                    <Input
                        className={inputCls}
                        placeholder="Google Map Link"
                        value={value.mapLink ?? ""}
                        onChange={e => set({ mapLink: e.target.value })}
                    />
                </div>
            </div>
            <ContactList contacts={value.contacts} onChange={c => set({ contacts: c })} />
        </div>
    );
}

// ── Contact ───────────────────────────────────────────────────────────────────

function SiteContactRow({ value, onChange, onRemove }: RowProps<AmcSiteContact>) {
    const set = (patch: Partial<AmcSiteContact>) => onChange({ ...value, ...patch });
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end py-2 border-b last:border-b-0">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                    className={inputCls}
                    placeholder="Name"
                    value={value.name}
                    onChange={e => set({ name: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Organization</label>
                <Input
                    className={inputCls}
                    placeholder="Organization"
                    value={value.organization ?? ""}
                    onChange={e => set({ organization: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mobile</label>
                <Input
                    className={inputCls}
                    placeholder="Mobile"
                    value={value.mobile}
                    onChange={e => set({ mobile: e.target.value })}
                />
            </div>
            <div className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                        className={inputCls}
                        placeholder="Email"
                        value={value.email ?? ""}
                        onChange={e => set({ email: e.target.value })}
                    />
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={onRemove}
                >
                    Remove
                </Button>
            </div>
        </div>
    );
}

function ContactList({
    contacts,
    onChange,
}: {
    contacts: AmcSiteContact[];
    onChange: (c: AmcSiteContact[]) => void;
}) {
    const update = (idx: number, c: AmcSiteContact) =>
        onChange(contacts.map((item, i) => (i === idx ? c : item)));
    const remove = (idx: number) =>
        onChange(contacts.filter((_, i) => i !== idx));

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Site Contact Details
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onChange([...contacts, { name: "", mobile: "" }])}
                >
                    <Plus className="h-3 w-3 mr-1" /> Add Contact
                </Button>
            </div>
            {contacts.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">
                    No contacts yet. Click "Add Contact".
                </p>
            )}
            {contacts.map((c, idx) => (
                <SiteContactRow
                    key={idx}
                    value={c}
                    onChange={v => update(idx, v)}
                    onRemove={() => remove(idx)}
                />
            ))}
        </div>
    );
}

// ── Product ───────────────────────────────────────────────────────────────────

function ProductRow({ value, onChange, onRemove }: RowProps<AmcProduct>) {
    const set = (patch: Partial<AmcProduct>) => onChange({ ...value, ...patch });
    return (
        <TableRow>
            <TableCell>
                <ItemSelect value={value.itemId} onChange={v => set({ itemId: v })} />
            </TableCell>
            <TableCell>
                <Input
                    className={inputCls}
                    placeholder="Description"
                    value={value.description ?? ""}
                    onChange={e => set({ description: e.target.value })}
                />
            </TableCell>
            <TableCell>
                <Input
                    className={inputCls}
                    placeholder="Make"
                    value={value.make ?? ""}
                    onChange={e => set({ make: e.target.value })}
                />
            </TableCell>
            <TableCell>
                <Input
                    className={inputCls}
                    placeholder="Model"
                    value={value.model ?? ""}
                    onChange={e => set({ model: e.target.value })}
                />
            </TableCell>
            <TableCell>
                <Input
                    className={inputCls}
                    placeholder="Serial Nos."
                    value={value.serialNo ?? ""}
                    onChange={e => set({ serialNo: e.target.value })}
                />
            </TableCell>
            <TableCell>
                <Input
                    className={inputCls}
                    type="number"
                    min={1}
                    value={value.quantity}
                    onChange={e => set({ quantity: Number(e.target.value) || 1 })}
                />
            </TableCell>
            <TableCell>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={onRemove}
                >
                    Remove
                </Button>
            </TableCell>
        </TableRow>
    );
}

function ItemSelect({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    const { data: items = [] } = useItems();
    return (
        <Combobox
            value={value ? String(value) : ""}
            onChange={v => onChange(v === "" ? 0 : Number(v))}
            options={items.map(item => ({ id: String(item.id), name: item.name }))}
            placeholder="Select Item"
        />
    );
}

// ── Engineer ──────────────────────────────────────────────────────────────────

function EngineerRow({ value, onChange, onRemove }: RowProps<AmcServiceEngineer>) {
    const set = (patch: Partial<AmcServiceEngineer>) => onChange({ ...value, ...patch });
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end py-2 border-b last:border-b-0">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                    className={inputCls}
                    placeholder="Name"
                    value={value.name}
                    onChange={e => set({ name: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Organization</label>
                <Input
                    className={inputCls}
                    placeholder="Organization"
                    value={value.organization ?? ""}
                    onChange={e => set({ organization: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mobile</label>
                <Input
                    className={inputCls}
                    placeholder="Mobile"
                    value={value.mobile}
                    onChange={e => set({ mobile: e.target.value })}
                />
            </div>
            <div className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                        className={inputCls}
                        placeholder="Email"
                        value={value.email ?? ""}
                        onChange={e => set({ email: e.target.value })}
                    />
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={onRemove}
                >
                    Remove
                </Button>
            </div>
        </div>
    );
}

// ── File input ────────────────────────────────────────────────────────────────

function FileInput({
    label,
    file,
    onChange,
}: {
    label: string;
    file: File | null;
    onChange: (f: File | null) => void;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {label}
            </label>
            <input
                type="file"
                className={
                    "border-input dark:bg-input/30 h-9 w-full rounded-md border " +
                    "bg-transparent px-3 py-1 text-sm outline-none file:mr-2 " +
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium"
                }
                onChange={e => onChange(e.target.files?.[0] ?? null)}
            />
            {file && (
                <span className="text-xs text-muted-foreground">{file.name}</span>
            )}
        </div>
    );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({
    icon,
    title,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className={sectionHeaderCls}>
            <h3 className={sectionTitleCls}>
                {icon}
                {title}
            </h3>
            {action}
        </div>
    );
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultSite: AmcSite = { name: "", address: "", contacts: [] };
const defaultEngineer: AmcServiceEngineer = { name: "", mobile: "" };
const defaultProduct: AmcProduct = { itemId: 0, quantity: 1 };
const defaultVariableBill = { label: "", amount: "" };

const FREQUENCY_MONTHS: Record<string, number> = {
    Monthly: 1,
    Quarterly: 3,
    "Half-Yearly": 6,
    Yearly: 12,
};

const toDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const computeBillDates = (start: string, end: string, frequency: string) => {
    const periodMonths = FREQUENCY_MONTHS[frequency] ?? 3;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

    const monthsBetween =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
    const count = Math.floor(monthsBetween / periodMonths);
    if (count < 1) return [];

    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + periodMonths * i);
        dates.push(toDateInput(date));
    }
    return dates;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORM
// ─────────────────────────────────────────────────────────────────────────────

const cleanSites = (sites: AmcSite[]) =>
    sites
        .filter(s => s.name.trim() && s.address.trim())
        .map(s => ({ ...s, contacts: s.contacts.filter(c => c.name.trim() && c.mobile.trim()) }));

const cleanProducts = (products: AmcProduct[]) => products.filter(p => p.itemId > 0);

const cleanEngineers = (engineers: AmcServiceEngineer[]) =>
    engineers.filter(e => e.name.trim() && e.mobile.trim());

export function AmcCreateForm({ amcId }: { amcId?: number }) {
    const navigate = useNavigate();
    const isEdit = !!amcId;

    const createAmc = useCreateAmc();
    const updateAmc = useUpdateAmc();
    const uploadFile = useAmcFileUpload();
    const { data: amc } = useAmc(amcId ?? 0);
    const { data: projects = [] } = useProjectsMaster();

    const form = useForm<AmcFormValues>({
        resolver: zodResolver(AmcFormSchema) as Resolver<AmcFormValues>,
        defaultValues: amcFormDefaultValues,
    });

    const billType = form.watch("billType") ?? "constant";
    const amcStartDate = form.watch("amcStartDate");
    const amcEndDate = form.watch("amcEndDate");
    const billFrequency = form.watch("billFrequency");

    const [sites, setSites] = useState<AmcSite[]>([defaultSite]);
    const [products, setProducts] = useState<AmcProduct[]>([]);
    const [engineers, setEngineers] = useState<AmcServiceEngineer[]>([]);
    const [variableBills, setVariableBills] = useState<
        Array<{ label: string; amount: string }>
    >([defaultVariableBill]);
    const [serviceReportFile, setServiceReportFile] = useState<File | null>(null);
    const [amcPoFile, setAmcPoFile] = useState<File | null>(null);

    useEffect(() => {
        if (billType !== "variable") return;
        if (!amcStartDate || !amcEndDate || !billFrequency) return;

        const dates = computeBillDates(amcStartDate, amcEndDate, billFrequency);
        if (!dates.length) return;

        setVariableBills(prev => {
            const matches =
                prev.length === dates.length && prev.every((row, i) => row.label === dates[i]);
            if (matches) return prev;
            return dates.map((date, i) => ({ label: date, amount: prev[i]?.amount ?? "" }));
        });
    }, [billType, amcStartDate, amcEndDate, billFrequency]);

    useEffect(() => {
        if (!isEdit || !amc) return;
        form.reset({
            teamName: amc.teamName,
            projectId: amc.projectId,
            serviceFrequency: amc.serviceFrequency,
            amcStartDate: amc.amcStartDate,
            amcEndDate: amc.amcEndDate,
            billFrequency: amc.billFrequency,
            billType: amc.billType,
            billValue: amc.billValue ?? "",
        });
        setSites(amc.sites?.length ? amc.sites : [defaultSite]);
        setProducts(amc.products ?? []);
        setEngineers(amc.serviceEngineers ?? []);
        setVariableBills(
            amc.variableBills?.length
                ? amc.variableBills.map((b, i) => ({
                      label: b.label || `Q${i + 1}`,
                      amount: b.amount != null ? String(b.amount) : "",
                  }))
                : [defaultVariableBill],
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, amc]);

    const saving = createAmc.isPending || updateAmc.isPending || uploadFile.isPending;

    const uploadPendingFiles = async (id: number) => {
        if (amcPoFile)
            await uploadFile.mutateAsync({ id, field: "po", file: amcPoFile });
        if (serviceReportFile)
            await uploadFile.mutateAsync({ id, field: "service-report", file: serviceReportFile });
    };

    const onSubmit = async (values: AmcFormValues) => {
        const payload: CreateAmcDto = {
            teamName: values.teamName,
            projectId: values.projectId,
            serviceFrequency: values.serviceFrequency,
            amcStartDate: values.amcStartDate,
            amcEndDate: values.amcEndDate,
            billFrequency: values.billFrequency,
            billType: values.billType,
            billValue:
                values.billType === "constant" && values.billValue?.trim()
                    ? values.billValue
                    : undefined,
            variableBills:
                values.billType === "variable"
                    ? variableBills
                          .filter(b => b.label || b.amount)
                          .map(b => ({ label: b.label, amount: b.amount ? Number(b.amount) : undefined }))
                    : undefined,
            serviceReportPath: amc?.serviceReportPath ?? null,
            amcPoPath: amc?.amcPoPath ?? null,
            sites: cleanSites(sites),
            products: cleanProducts(products),
            serviceEngineers: cleanEngineers(engineers),
        };

        try {
            if (isEdit && amcId) {
                const updated = await updateAmc.mutateAsync({ id: amcId, data: payload });
                await uploadPendingFiles(updated.id);
                navigate(paths.services.amcShow(updated.id));
            } else {
                const created = await createAmc.mutateAsync(payload);
                await uploadPendingFiles(created.id);
                navigate(paths.services.amc);
            }
        } catch {
            // handled by hooks
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-4 border-b bg-muted/30">
                        <h2 className="text-base font-semibold">
                            {isEdit
                                ? "Edit AMC / Warranty Service"
                                : "Create New AMC / Warranty Service"}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Fill in all sections below and save.
                        </p>
                    </div>

                    {/* ── 1. Team & Project ──────────────────────────────────── */}
                    <div className={sectionCls}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField<AmcFormValues, "teamName">
                                control={form.control}
                                name="teamName"
                                label="Team Name"
                                options={TEAM_OPTIONS}
                                placeholder="Select Team"
                            />
                            <SelectField<AmcFormValues, "projectId">
                                control={form.control}
                                name="projectId"
                                label="Project Name"
                                valueType="number"
                                placeholder="Select Project"
                                options={projects.map(p => ({
                                    value: String(p.id),
                                    label: p.projectName ?? `Project ${p.id}`,
                                }))}
                            />
                        </div>
                    </div>

                    {/* ── 2. Site Details ────────────────────────────────────── */}
                    <div className={sectionCls}>
                        <SectionDivider
                            icon={<MapPin className="h-4 w-4" />}
                            title="Site Details"
                            action={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                        setSites(s => [
                                            ...s,
                                            { ...defaultSite, contacts: [] },
                                        ])
                                    }
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Site
                                </Button>
                            }
                        />
                        <div className="space-y-4">
                            {sites.map((site, idx) => (
                                <SiteRow
                                    key={idx}
                                    value={site}
                                    removable={sites.length > 1}
                                    onChange={v =>
                                        setSites(s =>
                                            s.map((it, i) => (i === idx ? v : it)),
                                        )
                                    }
                                    onRemove={() =>
                                        setSites(s => s.filter((_, i) => i !== idx))
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── 3. Service & Billing ───────────────────────────────── */}
                    <div className={sectionCls}>
                        <SectionDivider
                            icon={<BadgeDollarSign className="h-4 w-4" />}
                            title="Service & Billing"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField<AmcFormValues, "serviceFrequency">
                                control={form.control}
                                name="serviceFrequency"
                                label="Service Frequency"
                                options={SERVICE_FREQUENCY_OPTIONS}
                                placeholder="Select Frequency"
                            />
                            <FieldWrapper<AmcFormValues, "amcStartDate">
                                control={form.control}
                                name="amcStartDate"
                                label="AMC Start Date"
                            >
                                {field => (
                                    <Input
                                        type="date"
                                        className={inputCls}
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<AmcFormValues, "amcEndDate">
                                control={form.control}
                                name="amcEndDate"
                                label="AMC End Date"
                            >
                                {field => (
                                    <Input
                                        type="date"
                                        className={inputCls}
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <SelectField<AmcFormValues, "billFrequency">
                                control={form.control}
                                name="billFrequency"
                                label="Bill Frequency"
                                options={BILL_FREQUENCY_OPTIONS}
                                placeholder="Select Frequency"
                            />
                            <SelectField<AmcFormValues, "billType">
                                control={form.control}
                                name="billType"
                                label="Bill Type"
                                options={BILL_TYPE_OPTIONS}
                                placeholder="Select Bill Type"
                            />
                            {billType === "constant" && (
                                <FieldWrapper<AmcFormValues, "billValue">
                                    control={form.control}
                                    name="billValue"
                                    label="Bill Value"
                                >
                                    {field => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className={inputCls}
                                            placeholder="0.00"
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            )}
                        </div>

                        {/* Variable bills */}
                        {billType === "variable" && (
                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Variable Bills
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                            setVariableBills(vb => [
                                                ...vb,
                                                { label: "", amount: "" },
                                            ])
                                        }
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add Row
                                    </Button>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bill Date</TableHead>
                                            <TableHead>Bill Value (Pre GST)</TableHead>
                                            <TableHead className="w-24" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variableBills.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        className={inputCls}
                                                        type="date"
                                                        value={row.label}
                                                        onChange={e =>
                                                            setVariableBills(vb =>
                                                                vb.map((r, i) =>
                                                                    i === idx
                                                                        ? { ...r, label: e.target.value }
                                                                        : r,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className={inputCls}
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={row.amount}
                                                        onChange={e =>
                                                            setVariableBills(vb =>
                                                                vb.map((r, i) =>
                                                                    i === idx
                                                                        ? { ...r, amount: e.target.value }
                                                                        : r,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {variableBills.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs text-destructive hover:text-destructive"
                                                            onClick={() =>
                                                                setVariableBills(vb =>
                                                                    vb.filter((_, i) => i !== idx),
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* ── 4. Service Engineers ───────────────────────────────── */}
                    <div className={sectionCls}>
                        <SectionDivider
                            icon={<Wrench className="h-4 w-4" />}
                            title="Service Engineer Assigned"
                            action={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                        setEngineers(e => [...e, { ...defaultEngineer }])
                                    }
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Engineer
                                </Button>
                            }
                        />
                        {engineers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No engineers added yet. Click "Add Engineer".
                            </p>
                        ) : (
                            <div className="rounded-lg border divide-y overflow-hidden">
                                {engineers.map((eng, idx) => (
                                    <div key={idx} className="px-4 py-1">
                                        <EngineerRow
                                            value={eng}
                                            onChange={v =>
                                                setEngineers(e =>
                                                    e.map((it, i) => (i === idx ? v : it)),
                                                )
                                            }
                                            onRemove={() =>
                                                setEngineers(e =>
                                                    e.filter((_, i) => i !== idx),
                                                )
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── 5. Documents (side by side) ────────────────────────── */}
                    <div className={sectionCls}>
                        <SectionDivider
                            icon={<Upload className="h-4 w-4" />}
                            title="Documents"
                        />
                        {/* ↓ two-column grid puts both uploads on one line */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FileInput
                                label="Service Report Format Upload"
                                file={serviceReportFile}
                                onChange={setServiceReportFile}
                            />
                            <FileInput
                                label="Upload AMC PO"
                                file={amcPoFile}
                                onChange={setAmcPoFile}
                            />
                        </div>
                    </div>

                    {/* ── 6. Products ────────────────────────────────────────── */}
                    <div className={sectionCls}>
                        <SectionDivider
                            icon={<Package className="h-4 w-4" />}
                            title="Products under AMC"
                            action={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                        setProducts(ps => [...ps, { ...defaultProduct }])
                                    }
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Product
                                </Button>
                            }
                        />
                        {products.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No products added yet. Click "Add Product".
                            </p>
                        ) : (
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Item</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Make</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead>Serial Nos.</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((p, idx) => (
                                            <ProductRow
                                                key={idx}
                                                value={p}
                                                onChange={v =>
                                                    setProducts(ps =>
                                                        ps.map((it, i) =>
                                                            i === idx ? v : it,
                                                        ),
                                                    )
                                                }
                                                onRemove={() =>
                                                    setProducts(ps =>
                                                        ps.filter((_, i) => i !== idx),
                                                    )
                                                }
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* ── Actions ────────────────────────────────────────────── */}
                    <div className="px-6 py-4 border-t bg-muted/20 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                navigate(
                                    amcId
                                        ? paths.services.amcShow(amcId)
                                        : paths.services.amc,
                                )
                            }
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-1" />
                            )}
                            {isEdit ? "Update AMC" : "Submit"}
                        </Button>
                    </div>

                </Card>
            </form>
        </Form>
    );
}