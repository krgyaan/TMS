import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { EyeIcon, Pencil, Plus, RefreshCw, Search, Send, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePaymentDashboard, usePaymentDashboardCounts } from "@/hooks/api/usePaymentRequests";
import { useNavigate, useSearchParams} from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { PendingTenderRowWithTimer, PaymentRequestRowWithTimer } from "./helpers/payment-request.types";
import { currencyCol, tenderNameCol } from "@/components/data-grid";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { ChangeStatusModal } from "../tenders/components/ChangeStatusModal";
import { useTenderingPermissions } from "../hooks/useTenderingPermissions";
import { formatINR } from "@/hooks/useINRFormatter";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { demandDraftsService } from '@/services/api/demand-drafts.service';
import { fdrsService } from '@/services/api/fdrs.service';
import { bankTransfersService } from '@/services/api/bank-transfers.service';
import { payOnPortalsService } from '@/services/api/pay-on-portals.service';
import { chequesService } from '@/services/api/cheques.service';
import { bankGuaranteesService } from '@/services/api/bank-guarantees.service';
import { paymentRequestsService } from '@/services/api/payment-requests.service';

const TABS = [
    { value: 'pending', label: 'Request Pending' },
    { value: 'sent', label: 'Request Sent' },
    { value: 'paid', label: 'EMD Paid' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'returned', label: 'Returned' },
    { value: 'fees', label: 'Tender/Processing Fees' },
    { value: 'others', label: 'Others' },
    { value: 'dnb', label: 'DNB' },
] as const;

type TabValue = typeof TABS[number]['value'];

const STATUS_COLORS: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Sent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Approved': 'bg-green-100 text-green-800 border-green-200',
    'Rejected': 'bg-red-100 text-red-800 border-red-200',
    'Returned': 'bg-purple-100 text-purple-800 border-purple-200',
};

const PURPOSE_COLORS: Record<string, string> = {
    'EMD': 'bg-blue-50 text-blue-700 border-blue-200',
    'Tender Fee': 'bg-green-50 text-green-700 border-green-200',
    'Processing Fee': 'bg-purple-50 text-purple-700 border-purple-200',
    'Security Deposit': 'bg-orange-50 text-orange-700 border-orange-200',
    'Performance BG': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Surety Bond': 'bg-pink-50 text-pink-700 border-pink-200',
    'Other Payment': 'bg-gray-50 text-gray-700 border-gray-200',
};

const INSTRUMENT_LABELS: Record<string, string> = {
    'DD': 'Demand Draft',
    'FDR': 'Fixed Deposit',
    'BG': 'Bank Guarantee',
    'Cheque': 'Cheque',
    'Bank Transfer': 'Bank Transfer',
    'Portal Payment': 'Portal Payment',
};

const EmdsAndTenderFeesPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as TabValue) || 'pending';
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
        open: false,
        tenderId: null
    });
    const { hasTenderingPermission } = useTenderingPermissions();
    const [exporting, setExporting] = useState(false);

    const EXPORT_TAB_OPTIONS = [
        { value: 'pending', label: 'Request Pending' },
        { value: 'sent', label: 'Request Sent' },
        { value: 'paid', label: 'EMD Paid' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'returned', label: 'Returned' },
        { value: 'fees', label: 'Tender/Processing Fees' },
        { value: 'others', label: 'Others' },
        { value: 'dnb', label: 'DNB' },
    ];
    const [exportTab, setExportTab] = useState('');

    const getActionFormData = async (instrumentId: number, instrumentType: string): Promise<Record<string, any>> => {
        try {
            switch (instrumentType) {
                case 'DD': return await demandDraftsService.getActionFormData(instrumentId);
                case 'FDR': return await fdrsService.getActionFormData(instrumentId);
                case 'Bank Transfer': return await bankTransfersService.getActionFormData(instrumentId);
                case 'Portal Payment': return await payOnPortalsService.getActionFormData(instrumentId);
                case 'Cheque': return await chequesService.getActionFormData(instrumentId);
                case 'BG': return await bankGuaranteesService.getActionFormData(instrumentId);
                default: return {};
            }
        } catch {
            return {};
        }
    };

    const fetchAllRows = async (tab: string): Promise<any[]> => {
        const allRows: any[] = [];
        let page = 1;
        const limit = 100;
        let total = 0;
        do {
            const data = await paymentRequestsService.getDashboard({ tab: tab as any, page, limit });
            allRows.push(...(data.data || []));
            total = data.meta?.total || data.data?.length || 0;
            page++;
        } while (allRows.length < total);
        return allRows;
    };

    const handleExport = async () => {
        if (!exportTab) return;
        setExporting(true);
        try {
            const rows = await fetchAllRows(exportTab);
            if (rows.length === 0) return;

            const isPendingTab = exportTab === 'pending' || exportTab === 'dnb';

            // Build base rows with dashboard fields
            let exportRows: Record<string, any>[];

            if (isPendingTab) {
                exportRows = rows.map((r: any) => ({
                    'Tender No': r.tenderNo || '',
                    'Tender Name': r.tenderName || '',
                    'Tender Value': r.gstValues || '',
                    'EMD': r.emd || '',
                    'Tender Fee': r.tenderFee || '',
                    'Processing Fee': r.processingFee || '',
                    'Member': r.teamMember || '',
                    'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
                    'Status': r.statusName || '',
                }));
            } else {
                // First map basic dashboard fields
                exportRows = rows.map((r: any) => ({
                    'Tender No': r.tenderNo || '',
                    'Tender Name': r.tenderName || '',
                    'Purpose': r.purpose || '',
                    'Amount Required': r.amountRequired || '',
                    'Mode': r.instrumentType || '',
                    'Favouring': r.favouring || '',
                    'Status': r.displayStatus || '',
                    'Member': r.teamMember || '',
                    'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
                    'Bid Valid Till': r.bidValid ? new Date(r.bidValid).toLocaleDateString('en-GB') : '',
                }));

                // For tabs with advanced forms (paid, fees, others, returned, rejected), fetch action form data per instrument
                if (['paid', 'fees', 'others', 'returned', 'rejected'].includes(exportTab)) {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (row.instrumentId && row.instrumentType) {
                            const formData = await getActionFormData(row.instrumentId, row.instrumentType);
                            if (formData && Object.keys(formData).length > 0) {
                                const flat = flattenFormData(formData, row.instrumentType);
                                Object.assign(exportRows[i], flat);
                            }
                        }
                    }
                }
            }

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, exportTab);
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([buf]), `${exportTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    const flattenFormData = (data: Record<string, any>, instrumentType: string): Record<string, any> => {
        const out: Record<string, any> = {};
        const prefix = instrumentType === 'DD' ? 'DD' : instrumentType === 'FDR' ? 'FDR' : instrumentType === 'BG' ? 'BG' : 
                       instrumentType === 'Cheque' ? 'Cheque' : instrumentType === 'Bank Transfer' ? 'BT' : 'POP';

        if (instrumentType === 'DD') {
            if (data.ddNo) out[`${prefix} No`] = data.ddNo;
            if (data.ddDate) out[`${prefix} Date`] = new Date(data.ddDate).toLocaleDateString('en-GB');
            if (data.reqNo) out['Courier Req No'] = data.reqNo;
            if (data.ddNeeds) out['Deliver By'] = data.ddNeeds;
            if (data.ddPurpose) out['Purpose Detail'] = data.ddPurpose;
            if (data.ddRemarks) out['Remarks'] = data.ddRemarks;
            if (data.utr) out['UTR'] = data.utr;
        } else if (instrumentType === 'FDR') {
            if (data.fdrNo) out[`${prefix} No`] = data.fdrNo;
            if (data.fdrDate) out[`${prefix} Date`] = new Date(data.fdrDate).toLocaleDateString('en-GB');
            if (data.reqNo) out['Courier Req No'] = data.reqNo;
            if (data.fdrNeeds) out['Deliver By'] = data.fdrNeeds;
            if (data.fdrPurpose) out['Purpose Detail'] = data.fdrPurpose;
            if (data.fdrRemark) out['Remarks'] = data.fdrRemark;
            if (data.fdrExpiryDate) out[`${prefix} Expiry`] = new Date(data.fdrExpiryDate).toLocaleDateString('en-GB');
            if (data.utr) out['UTR'] = data.utr;
        } else if (instrumentType === 'Bank Transfer') {
            if (data.accountName) out['Account Name'] = data.accountName;
            if (data.utrNo) out['UTR'] = data.utrNo;
            if (data.transactionDate) out['Transaction Date'] = new Date(data.transactionDate).toLocaleDateString('en-GB');
            if (data.utrMsg) out['UTR Message'] = data.utrMsg;
            if (data.transferDate) out['Transfer Date'] = new Date(data.transferDate).toLocaleDateString('en-GB');
            if (data.returnUtr) out['Return UTR'] = data.returnUtr;
            if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
        } else if (instrumentType === 'Portal Payment') {
            if (data.portalName) out['Portal Name'] = data.portalName;
            if (data.utrNo) out['UTR'] = data.utrNo;
            if (data.transactionDate) out['Transaction Date'] = new Date(data.transactionDate).toLocaleDateString('en-GB');
            if (data.utrMsg) out['UTR Message'] = data.utrMsg;
            if (data.transferDate) out['Transfer Date'] = new Date(data.transferDate).toLocaleDateString('en-GB');
            if (data.returnUtr) out['Return UTR'] = data.returnUtr;
            if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
        } else if (instrumentType === 'Cheque') {
            if (data.chequeNo) out['Cheque No'] = data.chequeNo;
            if (data.chequeDate) out['Cheque Date'] = new Date(data.chequeDate).toLocaleDateString('en-GB');
            if (data.bankName) out['Bank'] = data.bankName;
            if (data.chequeNeeds) out['Cheque Needs'] = data.chequeNeeds;
            if (data.chequeReason) out['Cheque Reason'] = data.chequeReason;
        } else if (instrumentType === 'BG') {
            if (data.bgNo) out['BG No'] = data.bgNo;
            if (data.bgDate) out['BG Date'] = new Date(data.bgDate).toLocaleDateString('en-GB');
            if (data.beneficiaryName) out['Beneficiary'] = data.beneficiaryName;
            if (data.bankName) out['Bank'] = data.bankName;
            if (data.bgPurpose) out['BG Purpose'] = data.bgPurpose;
            if (data.bgNeeds) out['BG Needs'] = data.bgNeeds;
        }

        // Common fields across all types
        if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
        if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
        if (data.payableAt) out['Payable At'] = data.payableAt;
        if (data.favouring && !out['Favouring']) out['Favouring'] = data.favouring;

        return out;
    };

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc'
            }));
        setSortModel(sortModel);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    // Fetch dashboard data
    const { data: dashboardData, isLoading, error, refetch } = usePaymentDashboard(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
        debouncedSearch || undefined
    );

    const { data: countsFromHook } = usePaymentDashboardCounts();
    // Use counts from dashboard response if available, otherwise fall back to separate counts hook
    const counts = dashboardData?.counts || countsFromHook;
    const totalRows = dashboardData?.meta?.total || dashboardData?.data?.length || 0;

    const columnDefs = useMemo<ColDef<any>[]>(() => {
        const isPendingTab = activeTab === 'pending' || activeTab === 'dnb';

        // ─── Shared columns ───
        const tenderDetailsCol = tenderNameCol<any>('tenderName', {
            field: 'tenderName',
            colId: 'tenderName',
            headerName: 'Tender Details',
            filter: true,
            width: isPendingTab ? 200 : 250,
        });

        const teamMemberCol: ColDef<any> = {
            field: 'teamMember',
            headerName: 'Member',
            width: isPendingTab ? 150 : 140,
            cellRenderer: (params: any) =>
                params.data?.teamMember || <span className="text-gray-400">Unassigned</span>,
        };

        const timerCol: ColDef<any> = {
            field: 'timer',
            headerName: 'Timer',
            width: 110,
            cellRenderer: (params: any) => {
                const timer = params.data?.timer;
                if (!timer) {
                    return <TenderTimerDisplay remainingSeconds={0} status="NOT_STARTED" />;
                }
                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                        deadline={timer.deadline}
                    />
                );
            },
        };

        // ─── Pending / DNB specific columns ───
        if (isPendingTab) {
            const actionCol: ColDef<any> = {
                headerName: '',
                filter: false,
                sortable: false,
                width: 57,
                cellRenderer: (params: any) => {
                    const actions: ActionItem<PendingTenderRowWithTimer>[] = [
                        {
                            label: 'View Tender',
                            icon: <EyeIcon className="w-4 h-4" />,
                            onClick: (r) => navigate(paths.tendering.tenderView(r.tenderId)),
                        },
                        // {
                        //     label: 'Mark As Missed',
                        //     icon: <XCircle className="h-4 w-4" />,
                        //     onClick: (r) => navigate(paths.tendering.bidMissedGlobal(r.tenderId, 'emd')),
                        //     visible: () => hasTenderingPermission && activeTab === 'pending',
                        // },
                    ];
                    if (activeTab === 'pending') {
                        actions.unshift({
                            label: 'Create Request',
                            icon: <Plus className="w-4 h-4" />,
                            onClick: (r) => navigate(paths.tendering.emdsTenderFeesCreate(r.tenderId)),
                        });
                    }
                    const ActionRenderer = createActionColumnRenderer(actions);
                    return <ActionRenderer data={params.data!} />;
                },
                pinned: 'right',
            };

            return [
                tenderDetailsCol,
                currencyCol<any>('gstValues', {
                    field: "gstValues",
                    colId: "gstValues",
                    headerName: 'Tender Value',
                    filter: true,
                    sortable: true,
                    width: 130,
                }),
                currencyCol<any>('emd', {
                    field: "emd",
                    colId: "emd",
                    headerName: "EMD",
                    filter: true,
                    sortable: true,
                    width: 120,
                    cellRenderer: (params: any) => {
                        const emd = params.data?.emd;
                        const emdMode = params.data?.emdMode;

                        if (!emd) return <span className="text-gray-400">—</span>;
                        return <p>{formatINR(emd)} {emdMode ? `(${emdMode})` : ''}</p>;
                    },
                }),
                currencyCol<any>('tenderFee', {
                    field: "tenderFee",
                    colId: "tenderFee",
                    headerName: "Tender Fee",
                    filter: true,
                    sortable: true,
                    width: 120,
                    cellRenderer: (params: any) => {
                        const tenderFee = params.data?.tenderFee;
                        const tenderFeeMode = params.data?.tenderFeeMode;

                        if (!tenderFee) return <span className="text-gray-400">—</span>;
                        return <p>{formatINR(tenderFee)} {tenderFeeMode ? `(${tenderFeeMode})` : ''}</p>;
                    },
                }),
                currencyCol<any>('processingFee', {
                    field: "processingFee",
                    colId: "processingFee",
                    headerName: "Processing Fee",
                    filter: true,
                    sortable: true,
                    width: 120,
                    cellRenderer: (params: any) => {
                        const processingFee = params.data?.processingFee;
                        const processingFeeMode = params.data?.processingFeeMode;

                        if (!processingFee) return <span className="text-gray-400">—</span>;
                        return <p>{formatINR(processingFee)} {processingFeeMode ? `(${processingFeeMode})` : ''}</p>;
                    },
                }),
                teamMemberCol,
                {
                    field: 'dueDate',
                    colId: 'dueDate',
                    headerName: 'Due Date',
                    width: 140,
                    cellRenderer: (params: any) => {
                        if (!params.value) return <span className="text-gray-400">—</span>;
                        const dueDate = new Date(params.value);
                        const isOverdue = dueDate < new Date();
                        const isUpcoming = dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                        return (
                            <span className={`${isOverdue ? 'text-red-600 font-medium' : isUpcoming ? 'text-orange-600' : ''}`}>
                                {formatDateTime(params.value)}
                            </span>
                        );
                    },
                    sortable: true,
                },
                {
                    field: 'statusName',
                    headerName: 'Status',
                    width: 150,
                    cellRenderer: (params: any) => (
                        <Badge variant="outline" className={STATUS_COLORS[params.value] || ''}>
                            {params.value}
                        </Badge>
                    ),
                },
                timerCol,
                actionCol,
            ];
        }

        // ─── Request tabs (sent, rejected, approved, etc.) ───
        const actionCol: ColDef<any> = {
            headerName: '',
            filter: false,
            sortable: false,
            width: 57,
            cellRenderer: (params: any) => {
                const row = params.data!;
                const actions: ActionItem<PaymentRequestRowWithTimer>[] = [
                    {
                        label: 'View Details',
                        icon: <EyeIcon className="w-4 h-4" />,
                        onClick: (r) => {
                            if (r.tenderId > 0) {
                                navigate(paths.tendering.emdsTenderFeesView(r.tenderId));
                            } else {
                                navigate(`${paths.tendering.emdsTenderFeesView(r.tenderId)}?pr=${r.id}`);
                            }
                        },
                    },
                    // {
                    //     label: 'Mark As Missed',
                    //     icon: <XCircle className="h-4 w-4" />,
                    //     onClick: (r) => navigate(paths.tendering.bidMissedGlobal(r.tenderId, 'emd')),
                    //     visible: () => hasTenderingPermission,
                    // },
                ];

                if (activeTab === 'sent' || activeTab === 'rejected') {
                    actions.unshift({
                        label: activeTab === 'rejected' ? 'Resubmit' : 'Edit Request',
                        icon: activeTab === 'rejected' ? <RefreshCw className="w-4 h-4" /> : <Pencil className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.emdsTenderFeesEdit(r.id)),
                    });
                }
                if (activeTab === 'paid') {
                    actions.unshift({
                        label: 'Follow Up',
                        icon: <Send className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.emdsTenderFeesFollowUp(r.id)),
                    });
                }
                const ActionRenderer = createActionColumnRenderer(actions);
                return <ActionRenderer data={row} />;
            },
            pinned: 'right',
        };

        return [
            tenderDetailsCol,
            {
                field: 'purpose',
                headerName: 'Purpose',
                width: 130,
                cellRenderer: (params: any) => (
                    <Badge variant="outline" className={`${PURPOSE_COLORS[params.value] || ''} font-medium`}>
                        {params.value}
                    </Badge>
                ),
            },
            currencyCol<any>('amountRequired', {
                field: "amountRequired",
                colId: "amountRequired",
                headerName: "Amount Required",
                filter: true,
                sortable: true,
                width: 100,
            }),
            {
                field: 'instrumentType',
                headerName: 'Mode',
                width: 120,
                cellRenderer: (params: any) => {
                    if (!params.value) return <span className="text-gray-400 text-sm">—</span>;
                    return <span>{INSTRUMENT_LABELS[params.value] || params.value}</span>;
                },
            },
            ...(activeTab === 'others' ? [{
                field: 'favouring' as const,
                headerName: 'Favouring',
                width: 180,
                cellRenderer: (params: any) => params.value || <span className="text-gray-400">—</span>,
            }] : []),
            {
                field: 'displayStatus',
                headerName: 'Status',
                width: 110,
                cellRenderer: (params: any) => (
                    <Badge variant="outline" className={STATUS_COLORS[params.value] || ''}>
                        {params.value}
                    </Badge>
                ),
            },
            {
                field: 'bidValid',
                headerName: 'Bid Valid Till',
                width: 150,
                cellRenderer: (params: any) => {
                    if (!params.value) return <span className="text-gray-400">—</span>;
                    return formatDateTime(params.value);
                },
            },
            teamMemberCol,
            timerCol,
            actionCol,
        ];
    }, [navigate, activeTab, setChangeStatusModal, hasTenderingPermission]);

    const tableData = dashboardData?.data || [];

    const renderTabTrigger = (tab: typeof TABS[number]) => {
        let count = 0;
        if (counts) {
            switch (tab.value) {
                case 'pending':
                    count = counts.pending ?? 0;
                    break;
                case 'sent':
                    count = counts.sent ?? 0;
                    break;
                case 'paid':
                    count = counts.paid ?? 0;
                    break;
                case 'rejected':
                    count = counts.rejected ?? 0;
                    break;
                case 'returned':
                    count = counts.returned ?? 0;
                    break;
                case 'fees':
                    count = counts.fees ?? 0;
                    break;
                case 'others':
                    count = counts.others ?? 0;
                    break;
                case 'dnb':
                    count = counts.dnb ?? 0;
                    break;
            }
        }
        return (
            <TabsTrigger key={tab.value} value={tab.value} className="relative">
                {tab.label}
                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                    {count}
                </Badge>
            </TabsTrigger>
        );
    };

    if (isLoading && !dashboardData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                    <CardDescription>Track all payment requests for your assigned tenders</CardDescription>
                    <div className="mt-4">
                        <Skeleton className="h-10 w-[500px]" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                    <CardDescription>Error loading payment requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <p className="text-red-500">Failed to load payment requests. Please try again.</p>
                        <Button variant="outline" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                        <CardDescription>
                            Track all payment requests for your assigned tenders
                        </CardDescription>
                    </div>
                    <CardAction className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsTenderFeesCreate())}>
                            <Plus className="w-4 h-4" />
                            Add Old Entries
                        </Button>
                        <Button variant="outline" onClick={() => navigate(paths.tendering.biOtherThanEmdsCreate())}>
                            <Plus className="w-4 h-4" />
                            BI Other Than EMDs
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex flex-col w-full">
                    <div className="flex-none m-auto mb-4">
                        <TabsList>
                            {TABS.map(renderTabTrigger)}
                        </TabsList>
                    </div>

                    {/* Search Row: Download + Search */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        <div className="flex items-center gap-2">
                            <Select value={exportTab} onValueChange={setExportTab}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Choose tab to export" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPORT_TAB_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={!exportTab || exporting}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {exporting ? 'Exporting...' : 'Download Excel'}
                            </Button>
                        </div>

                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        <DataTable
                            data={tableData}
                            loading={isLoading}
                            columnDefs={columnDefs as ColDef[]}
                            manualPagination={true}
                            rowCount={totalRows}
                            paginationState={pagination}
                            onPaginationChange={setPagination}
                            onPageSizeChange={handlePageSizeChange}
                            showTotalCount={true}
                            showLengthChange={true}
                            gridOptions={{
                                defaultColDef: {
                                    filter: true,
                                    resizable: true,
                                    sortable: true,
                                },
                                onSortChanged: handleSortChanged,
                                suppressRowClickSelection: true,
                                overlayNoRowsTemplate: `<span style="padding: 10px; text-align: center;">No ${activeTab} items found</span>`,
                            }}
                        />
                    </div>
                </Tabs>
            </CardContent>
            <ChangeStatusModal
                open={changeStatusModal.open}
                onOpenChange={(open) => setChangeStatusModal({ ...changeStatusModal, open })}
                tenderId={changeStatusModal.tenderId}
                currentStatus={changeStatusModal.currentStatus}
                onSuccess={() => {
                    setChangeStatusModal({ open: false, tenderId: null });
                }}
            />
        </Card>
    );
};

export default EmdsAndTenderFeesPage;
