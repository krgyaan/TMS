import { paths } from '@/app/routes/paths';
import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
import { tenderNameCol } from '@/components/data-grid/columns';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { QuickFilter } from '@/components/ui/quick-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useTenderFeeDDDashboard, useTenderFeeDDDashboardCounts,
    useTenderFeePortalDashboard, useTenderFeePortalDashboardCounts,
    useTenderFeeTransferDashboard, useTenderFeeTransferDashboardCounts,
} from '@/hooks/api/useTenderFees';
import { useBiExport } from '@/hooks/useBiExport';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { tenderFeesService } from '@/services/api/tender-fees.service';
import type { ColDef } from 'ag-grid-community';
import { Banknote, CheckCircle, Clock, Edit, Eye, FileX2, Landmark, RotateCcw, Search, Wallet, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ParentTab = 'dd' | 'portal' | 'transfer';
type DDSubTab = 'pending' | 'created' | 'rejected' | 'returned' | 'cancelled';
type PortalSubTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';
type TransferSubTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';

const DD_TABS_CONFIG: Array<{ key: DDSubTab; name: string; icon: React.ReactNode; description: string }> = [
    { key: 'pending', name: 'Pending', icon: <Clock className="h-4 w-4" />, description: 'Pending demand drafts' },
    { key: 'created', name: 'Created', icon: <CheckCircle className="h-4 w-4" />, description: 'Created demand drafts' },
    { key: 'rejected', name: 'Rejected', icon: <XCircle className="h-4 w-4" />, description: 'Rejected demand drafts' },
    { key: 'returned', name: 'Returned', icon: <RotateCcw className="h-4 w-4" />, description: 'Returned demand drafts' },
    { key: 'cancelled', name: 'Cancelled', icon: <XCircle className="h-4 w-4" />, description: 'Cancelled demand drafts' },
];

const PORTAL_TABS_CONFIG: Array<{ key: PortalSubTab; name: string; icon: React.ReactNode; description: string }> = [
    { key: 'pending', name: 'Pending', icon: <Clock className="h-4 w-4" />, description: 'Pending portal payments' },
    { key: 'accepted', name: 'Accepted', icon: <CheckCircle className="h-4 w-4" />, description: 'Accepted portal payments' },
    { key: 'rejected', name: 'Rejected', icon: <XCircle className="h-4 w-4" />, description: 'Rejected portal payments' },
    { key: 'returned', name: 'Returned', icon: <RotateCcw className="h-4 w-4" />, description: 'Returned portal payments' },
    { key: 'settled', name: 'Settled', icon: <Wallet className="h-4 w-4" />, description: 'Settled portal payments' },
];

const TRANSFER_TABS_CONFIG: Array<{ key: TransferSubTab; name: string; icon: React.ReactNode; description: string }> = [
    { key: 'pending', name: 'Pending', icon: <Clock className="h-4 w-4" />, description: 'Pending bank transfers' },
    { key: 'accepted', name: 'Accepted', icon: <CheckCircle className="h-4 w-4" />, description: 'Accepted bank transfers' },
    { key: 'rejected', name: 'Rejected', icon: <XCircle className="h-4 w-4" />, description: 'Rejected bank transfers' },
    { key: 'returned', name: 'Returned', icon: <RotateCcw className="h-4 w-4" />, description: 'Returned bank transfers' },
    { key: 'settled', name: 'Settled', icon: <Wallet className="h-4 w-4" />, description: 'Settled bank transfers' },
];

const flattenDDFormData = (data: Record<string, any>): Record<string, any> => {
    const out: Record<string, any> = {};
    if (data.payableAt) out['Payable At'] = data.payableAt;
    if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
    if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
    if (data.utr) out['UTR'] = data.utr;
    if (data.docketNo) out['Docket No'] = data.docketNo;
    if (data.courierAddress) out['Courier Address'] = data.courierAddress;
    if (data.courierDeadline) out['Courier Deadline'] = String(data.courierDeadline);
    if (data.reqNo) out['Req No'] = data.reqNo;
    if (data.ddNeeds) out['DD Needs'] = data.ddNeeds;
    if (data.ddPurpose) out['DD Purpose'] = data.ddPurpose;
    if (data.ddRemarks) out['DD Remarks'] = data.ddRemarks;
    return out;
};

const flattenPortalFormData = (data: Record<string, any>): Record<string, any> => {
    const out: Record<string, any> = {};
    if (data.utr) out['UTR'] = data.utr;
    if (data.utrMsg) out['UTR Msg'] = data.utrMsg;
    if (data.returnTransferDate) out['Return Transfer Date'] = new Date(data.returnTransferDate).toLocaleDateString('en-GB');
    if (data.returnUtr) out['Return UTR'] = data.returnUtr;
    if (data.remarks) out['Remarks'] = data.remarks;
    if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
    if (data.paymentMethod) out['Payment Method'] = data.paymentMethod;
    if (data.isNetbanking) out['Is Netbanking'] = data.isNetbanking ? 'Yes' : 'No';
    if (data.isDebit) out['Is Debit'] = data.isDebit ? 'Yes' : 'No';
    return out;
};

const flattenTransferFormData = (data: Record<string, any>): Record<string, any> => {
    const out: Record<string, any> = {};
    if (data.utr) out['UTR'] = data.utr;
    if (data.accountNumber) out['Account Number'] = data.accountNumber;
    if (data.ifsc) out['IFSC'] = data.ifsc;
    if (data.utrMsg) out['UTR Msg'] = data.utrMsg;
    if (data.returnTransferDate) out['Return Transfer Date'] = new Date(data.returnTransferDate).toLocaleDateString('en-GB');
    if (data.returnUtr) out['Return UTR'] = data.returnUtr;
    if (data.remarks) out['Remarks'] = data.remarks;
    if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
    if (data.paymentMethod) out['Payment Method'] = data.paymentMethod;
    return out;
};

const mapDDPendingRow = (r: any) => ({
    'Tender Name': r.projectName || '',
    'Tender No': r.projectNo || '',
    'Beneficiary name': r.beneficiaryName || '',
    'Purpose': r.purpose || '',
    'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
    'Amount': r.ddAmount || '',
    'Tender Status': r.tenderStatus || '',
    'Member': r.teamMember || '',
    'Expiry': r.expiry || '',
    'DD Status': r.ddStatus || '',
});

const mapDDRow = (r: any, isAllTab: boolean) => {
    const base: Record<string, any> = {
        'Tender Name': r.projectName || '',
        'Tender No': r.projectNo || '',
        'DD Date': r.ddCreationDate ? new Date(r.ddCreationDate).toLocaleDateString('en-GB') : '',
        'DD No': r.ddNo || '',
        'Beneficiary name': r.beneficiaryName || '',
        'Purpose': r.purpose || '',
        'Amount': r.ddAmount || '',
        'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
        'Tender Status': r.tenderStatus || '',
        'Member': r.teamMember || '',
        'Expiry': r.expiry || '',
        'DD Status': r.ddStatus || '',
    };
    if (isAllTab) base['Tab'] = r._tab || '';
    return base;
};

const mapPortalPendingRow = (r: any) => ({
    'Tender Name': r.projectName || '',
    'Tender No': r.projectNo || '',
    'Team Member': r.teamMember || '',
    'Tender Status': r.tenderStatus || '',
    'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
    'Purpose': r.purpose || '',
    'Amount': r.amount || '',
    'POP Status': r.popStatus || '',
});

const mapPortalRow = (r: any, isAllTab: boolean) => {
    const base: Record<string, any> = {
        'Tender Name': r.projectName || '',
        'Tender No': r.projectNo || '',
        'Date': r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
        'Team Member': r.teamMember || '',
        'Tender Status': r.tenderStatus || '',
        'UTR No': r.utrNo || '',
        'Portal Name': r.portalName || '',
        'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
        'Purpose': r.purpose || '',
        'Amount': r.amount || '',
        'POP Status': r.popStatus || '',
    };
    if (isAllTab) base['Tab'] = r._tab || '';
    return base;
};

const mapTransferPendingRow = (r: any) => ({
    'Tender Name': r.projectName || '',
    'Tender No': r.projectNo || '',
    'Date': r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
    'Team Member': r.teamMember || '',
    'Tender Status': r.tenderStatus || '',
    'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
    'Purpose': r.purpose || '',
    'Amount': r.amount || '',
    'BT Status': r.btStatus || '',
});

const mapTransferRow = (r: any, isAllTab: boolean) => {
    const base: Record<string, any> = {
        'Tender Name': r.projectName || '',
        'Tender No': r.projectNo || '',
        'Date': r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
        'Team Member': r.teamMember || '',
        'Tender Status': r.tenderStatus || '',
        'UTR No': r.utrNo || '',
        'Account Name': r.accountName || '',
        'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
        'Purpose': r.purpose || '',
        'Amount': r.amount || '',
        'BT Status': r.btStatus || '',
    };
    if (isAllTab) base['Tab'] = r._tab || '';
    return base;
};

const getDDStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const s = status.toLowerCase();
    if (s.includes('created')) return 'default';
    if (s.includes('cancelled') || s.includes('rejected')) return 'destructive';
    return 'secondary';
};

const getPortalStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const s = status.toLowerCase();
    if (s.includes('accepted') || s.includes('settled')) return 'default';
    if (s.includes('rejected')) return 'destructive';
    return 'secondary';
};

const TenderFeeListPage = () => {
    const [parentTab, setParentTab] = useState<ParentTab>('dd');
    const navigate = useNavigate();

    // DD state
    const [ddSubTab, setDdSubTab] = useState<DDSubTab>('pending');
    const [ddPagination, setDdPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [ddSort, setDdSort] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [ddSearch, setDdSearch] = useState('');
    const ddSearchDebounced = useDebouncedSearch(ddSearch, 300);

    // Portal state
    const [portalSubTab, setPortalSubTab] = useState<PortalSubTab>('pending');
    const [portalPagination, setPortalPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [portalSort, setPortalSort] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [portalSearch, setPortalSearch] = useState('');
    const portalSearchDebounced = useDebouncedSearch(portalSearch, 300);

    // Transfer state
    const [transferSubTab, setTransferSubTab] = useState<TransferSubTab>('pending');
    const [transferPagination, setTransferPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [transferSort, setTransferSort] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [transferSearch, setTransferSearch] = useState('');
    const transferSearchDebounced = useDebouncedSearch(transferSearch, 300);

    const [teamFilter, setTeamFilter] = useState<string>('All');
    const teamId = teamFilter === 'All' ? undefined : teamFilter === 'AC' ? 1 : 2;

    // ─── DD data ───
    const { data: ddApiResponse, isLoading: ddLoading } = useTenderFeeDDDashboard({
        tab: ddSubTab,
        page: ddPagination.pageIndex + 1,
        limit: ddPagination.pageSize,
        sortBy: ddSort[0]?.colId,
        sortOrder: ddSort[0]?.sort,
        search: ddSearchDebounced || undefined,
        team: teamId,
    });
    const { data: ddCounts } = useTenderFeeDDDashboardCounts();

    // ─── Portal data ───
    const { data: portalApiResponse, isLoading: portalLoading } = useTenderFeePortalDashboard({
        tab: portalSubTab,
        page: portalPagination.pageIndex + 1,
        limit: portalPagination.pageSize,
        sortBy: portalSort[0]?.colId,
        sortOrder: portalSort[0]?.sort,
        search: portalSearchDebounced || undefined,
        team: teamId,
    });
    const { data: portalCounts } = useTenderFeePortalDashboardCounts();

    // ─── Transfer data ───
    const { data: transferApiResponse, isLoading: transferLoading } = useTenderFeeTransferDashboard({
        tab: transferSubTab,
        page: transferPagination.pageIndex + 1,
        limit: transferPagination.pageSize,
        sortBy: transferSort[0]?.colId,
        sortOrder: transferSort[0]?.sort,
        search: transferSearchDebounced || undefined,
        team: teamId,
    });
    const { data: transferCounts } = useTenderFeeTransferDashboardCounts();

    // ─── Export ───
    const getExportDataFn = useCallback((params: any) => {
        if (parentTab === 'dd') return tenderFeesService.getDDExportData(params);
        if (parentTab === 'portal') return tenderFeesService.getPortalExportData(params);
        return tenderFeesService.getTransferExportData(params);
    }, [parentTab]);

    const exportConfig = useMemo(() => {
        const isDD = parentTab === 'dd';
        const isPortal = parentTab === 'portal';
        return {
            getExportDataFn,
            tabsConfig: isDD ? DD_TABS_CONFIG : isPortal ? PORTAL_TABS_CONFIG : TRANSFER_TABS_CONFIG,
            pendingTabKey: 'pending' as const,
            tabsWithForm: isDD
                ? ['created', 'rejected', 'returned', 'cancelled']
                : ['accepted', 'rejected', 'returned', 'settled'],
            filenamePrefix: `tender-fee-${parentTab}`,
            flattenFormData: isDD ? flattenDDFormData : isPortal ? flattenPortalFormData : flattenTransferFormData,
            mapPendingRow: isDD ? mapDDPendingRow : isPortal ? mapPortalPendingRow : mapTransferPendingRow,
            mapRow: isDD ? mapDDRow : isPortal ? mapPortalRow : mapTransferRow,
        };
    }, [parentTab, getExportDataFn]);

    const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport(exportConfig);

    // ─── DD column defs ───
    const ddActions: ActionItem<any>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeView('dd', row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeAction('dd', row.id)),
            },
        ],
        [navigate],
    );

    const ddColDefs = useMemo<ColDef<any>[]>(
        () => [
            {
                field: 'ddCreationDate', headerName: 'DD Date', width: 110, colId: 'ddCreationDate',
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—', sortable: true,
                comparator: (a, b) => { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime(); },
                hide: ddSubTab === 'pending' || ddSubTab === 'rejected',
            },
            {
                field: 'ddNo', headerName: 'DD No', width: 100, colId: 'ddNo',
                valueGetter: (p) => p.data?.ddNo || '—', sortable: true,
                hide: ddSubTab === 'pending' || ddSubTab === 'rejected',
            },
            tenderNameCol<any>('tenderNo', { headerName: 'Tender Details', filter: true, width: 200, maxWidth: 200, sortable: true }),
            {
                field: 'tenderStatus', headerName: 'Tender Status', width: 140, colId: 'tenderStatus',
                valueGetter: (p) => p.data?.tenderStatus || '—', sortable: true, maxWidth: 130,
            },
            {
                field: 'beneficiaryName', headerName: 'Beneficiary name', maxWidth: 200, colId: 'beneficiaryName',
                valueGetter: (p) => p.data?.beneficiaryName || '—', sortable: true,
            },
            {
                field: 'purpose', headerName: 'Purpose', width: 120, colId: 'purpose',
                valueGetter: (p) => p.data?.purpose || '—', sortable: true,
            },
            {
                field: 'ddAmount', headerName: 'Amount', width: 120, maxWidth: 120, colId: 'ddAmount', sortable: true,
                valueFormatter: (p) => p.value ? formatINR(p.value) : '—',
            },
            {
                field: 'bidValidity', headerName: 'Bid Validity', width: 110, maxWidth: 110, colId: 'bidValidity', sortable: true,
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—',
                comparator: (a, b) => { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime(); },
            },
            {
                field: 'teamMember', headerName: 'Member', width: 120, maxWidth: 120, colId: 'teamMember',
                valueGetter: (p) => p.data?.teamMember || '—', sortable: true,
            },
            {
                field: 'expiry', headerName: 'Expiry', width: 90, maxWidth: 90, colId: 'expiry', sortable: true,
                valueGetter: (p) => p.data?.expiry || '—',
                cellRenderer: (params: any) => {
                    const v = params.value;
                    if (!v) return '—';
                    if (v === 'No date') return <Badge variant="secondary">No date</Badge>;
                    if (v === 'Expired') return <Badge variant="destructive">Expired</Badge>;
                    return <Badge variant="default">{v}</Badge>;
                },
            },
            {
                field: 'ddStatus', headerName: 'Status', width: 130, maxWidth: 130, colId: 'ddStatus', sortable: true,
                cellRenderer: (params: any) => {
                    const v = params.value;
                    if (!v) return '—';
                    return <Badge variant={getDDStatusVariant(v) as any}>{v}</Badge>;
                },
            },
            {
                headerName: '', filter: false, cellRenderer: createActionColumnRenderer(ddActions),
                sortable: false, pinned: 'right', width: 57,
            },
        ],
        [ddActions, ddSubTab],
    );

    // ─── Portal column defs ───
    const portalActions: ActionItem<any>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeView('portal', row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeAction('portal', row.id)),
            },
        ],
        [navigate],
    );

    const portalColDefs = useMemo<ColDef<any>[]>(
        () => [
            {
                field: 'date', headerName: 'Date', width: 100, colId: 'date',
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—', sortable: true,
                comparator: (a, b) => { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime(); },
                hide: portalSubTab === 'pending' || portalSubTab === 'rejected',
            },
            tenderNameCol<any>('tenderNo', { headerName: 'Tender Details', filter: true, width: 200, maxWidth: 200, sortable: true }),
            {
                field: 'tenderStatus', headerName: 'Tender Status', width: 140, colId: 'tenderStatus',
                valueGetter: (p) => p.data?.tenderStatus || '—', sortable: true, maxWidth: 130,
            },
            {
                field: 'utrNo', headerName: 'UTR No', width: 140, colId: 'utrNo',
                valueGetter: (p) => p.data?.utrNo || '—', sortable: true,
                hide: portalSubTab === 'pending',
            },
            {
                field: 'portalName', headerName: 'Portal', width: 120, colId: 'portalName',
                valueGetter: (p) => p.data?.portalName || '—', sortable: true,
            },
            {
                field: 'purpose', headerName: 'Purpose', width: 120, colId: 'purpose',
                valueGetter: (p) => p.data?.purpose || '—', sortable: true,
            },
            {
                field: 'amount', headerName: 'Amount', width: 120, maxWidth: 120, colId: 'amount', sortable: true,
                valueFormatter: (p) => p.value ? formatINR(p.value) : '—',
            },
            {
                field: 'bidValidity', headerName: 'Bid Validity', width: 110, maxWidth: 110, colId: 'bidValidity', sortable: true,
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—',
            },
            {
                field: 'teamMember', headerName: 'Member', width: 120, maxWidth: 120, colId: 'teamMember',
                valueGetter: (p) => p.data?.teamMember || '—', sortable: true,
            },
            {
                field: 'popStatus', headerName: 'Status', width: 110, maxWidth: 110, colId: 'popStatus', sortable: true,
                cellRenderer: (params: any) => {
                    const v = params.value;
                    if (!v) return '—';
                    return <Badge variant={getPortalStatusVariant(v) as any}>{v}</Badge>;
                },
            },
            {
                headerName: '', filter: false, cellRenderer: createActionColumnRenderer(portalActions),
                sortable: false, pinned: 'right', width: 57,
            },
        ],
        [portalActions, portalSubTab],
    );

    // ─── Transfer column defs ───
    const transferActions: ActionItem<any>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeView('transfer', row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: any) => navigate(paths.bi.tenderFeeAction('transfer', row.id)),
            },
        ],
        [navigate],
    );

    const transferColDefs = useMemo<ColDef<any>[]>(
        () => [
            {
                field: 'date', headerName: 'Date', width: 100, colId: 'date',
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—', sortable: true,
                comparator: (a, b) => { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime(); },
                hide: transferSubTab === 'pending' || transferSubTab === 'rejected',
            },
            tenderNameCol<any>('tenderNo', { headerName: 'Tender Details', filter: true, width: 200, maxWidth: 200, sortable: true }),
            {
                field: 'tenderStatus', headerName: 'Tender Status', width: 140, colId: 'tenderStatus',
                valueGetter: (p) => p.data?.tenderStatus || '—', sortable: true, maxWidth: 130,
            },
            {
                field: 'utrNo', headerName: 'UTR No', width: 140, colId: 'utrNo',
                valueGetter: (p) => p.data?.utrNo || '—', sortable: true,
                hide: transferSubTab === 'pending',
            },
            {
                field: 'accountName', headerName: 'Account Name', width: 150, colId: 'accountName',
                valueGetter: (p) => p.data?.accountName || '—', sortable: true,
            },
            {
                field: 'purpose', headerName: 'Purpose', width: 120, colId: 'purpose',
                valueGetter: (p) => p.data?.purpose || '—', sortable: true,
            },
            {
                field: 'amount', headerName: 'Amount', width: 120, maxWidth: 120, colId: 'amount', sortable: true,
                valueFormatter: (p) => p.value ? formatINR(p.value) : '—',
            },
            {
                field: 'bidValidity', headerName: 'Bid Validity', width: 110, maxWidth: 110, colId: 'bidValidity', sortable: true,
                valueFormatter: (p) => p.value ? formatDate(p.value) : '—',
            },
            {
                field: 'teamMember', headerName: 'Member', width: 120, maxWidth: 120, colId: 'teamMember',
                valueGetter: (p) => p.data?.teamMember || '—', sortable: true,
            },
            {
                field: 'btStatus', headerName: 'Status', width: 110, maxWidth: 110, colId: 'btStatus', sortable: true,
                cellRenderer: (params: any) => {
                    const v = params.value;
                    if (!v) return '—';
                    return <Badge variant={getPortalStatusVariant(v) as any}>{v}</Badge>;
                },
            },
            {
                headerName: '', filter: false, cellRenderer: createActionColumnRenderer(transferActions),
                sortable: false, pinned: 'right', width: 57,
            },
        ],
        [transferActions, transferSubTab],
    );

    // ─── DD tabs with counts ───
    const ddTabsWithData = useMemo(() => DD_TABS_CONFIG.map(t => ({ ...t, count: ddCounts ? (ddCounts as any)[t.key] ?? 0 : 0 })), [ddCounts]);
    const portalTabsWithData = useMemo(() => PORTAL_TABS_CONFIG.map(t => ({ ...t, count: portalCounts ? (portalCounts as any)[t.key] ?? 0 : 0 })), [portalCounts]);
    const transferTabsWithData = useMemo(() => TRANSFER_TABS_CONFIG.map(t => ({ ...t, count: transferCounts ? (transferCounts as any)[t.key] ?? 0 : 0 })), [transferCounts]);

    const ddData = ddApiResponse?.data || [];
    const portalData = portalApiResponse?.data || [];
    const transferData = transferApiResponse?.data || [];
    const ddTotal = ddApiResponse?.meta?.total || 0;
    const portalTotal = portalApiResponse?.meta?.total || 0;
    const transferTotal = transferApiResponse?.meta?.total || 0;

    const isLoading = parentTab === 'dd' ? ddLoading : parentTab === 'portal' ? portalLoading : transferLoading;

    const handleDdSort = useCallback((event: any) => {
        const sortModel = event.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setDdSort(sortModel);
        setDdPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePortalSort = useCallback((event: any) => {
        const sortModel = event.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setPortalSort(sortModel);
        setPortalPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const handleTransferSort = useCallback((event: any) => {
        const sortModel = event.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setTransferSort(sortModel);
        setTransferPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const renderTabContent = (
        subTab: string,
        setSubTab: (v: any) => void,
        tabsConfig: any[],
        tabsWithData: any[],
        data: any[],
        total: number,
        colDefs: ColDef<any>[],
        search: string,
        setSearch: (v: string) => void,
        pagination: { pageIndex: number; pageSize: number },
        setPagination: (v: any) => void,
        onSortChanged: (e: any) => void,
    ) => (
        <Tabs value={subTab} onValueChange={(v) => { setSubTab(v); setPagination((p: any) => ({ ...p, pageIndex: 0 })); }}>
            <TabsList className="m-auto mb-4">
                {tabsWithData.map((tab: any) => (
                    <TabsTrigger key={tab.key} value={tab.key} className="data-[state=active]:shadow-md flex items-center gap-2">
                        {tab.icon}
                        <span className="font-semibold text-sm">{tab.name}</span>
                        {tab.count > 0 && <Badge variant="secondary" className="text-xs ml-1">{tab.count}</Badge>}
                    </TabsTrigger>
                ))}
            </TabsList>

            <div className="flex items-center gap-4 px-6 pb-4">
                <QuickFilter
                    options={[
                        { label: 'AC Team', value: 'AC' },
                        { label: 'DC Team', value: 'DC' },
                        { label: 'All Team', value: 'All' },
                    ]}
                    value={teamFilter}
                    onChange={(v) => setTeamFilter(v)}
                />
                <div className="flex-1 flex justify-end">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
                    </div>
                </div>
            </div>

            {tabsWithData.map((tab: any) => (
                <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                    {subTab === tab.key && (
                        <>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <FileX2 className="h-12 w-12 mb-4" />
                                    <p className="text-lg font-medium">No {tab.name.toLowerCase()} records</p>
                                    <p className="text-sm mt-2">{tab.description}</p>
                                </div>
                            ) : (
                                <DataTable
                                    data={data}
                                    columnDefs={colDefs}
                                    loading={isLoading}
                                    autoSizeColumns={true}
                                    manualPagination={true}
                                    rowCount={total}
                                    paginationState={pagination}
                                    onPaginationChange={setPagination}
                                    onPageSizeChange={(n: number) => setPagination((p: any) => ({ ...p, pageIndex: 0, pageSize: n }))}
                                    showTotalCount={true}
                                    showLengthChange={true}
                                    gridOptions={{
                                        defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
                                        onSortChanged,
                                        overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No records found</span>',
                                    }}
                                />
                            )}
                        </>
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );

    if (isLoading && parentTab === 'dd' && ddData.length === 0) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-[500px] w-full" />
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
                        <CardTitle>Tender Fee & Processing Fee Dashboard</CardTitle>
                        <CardDescription className="mt-2">
                            Track and manage tender fee and processing fee payments across all instrument types.
                        </CardDescription>
                    </div>
                    <ExportExcelDropdown
                        exportOptions={exportOptions}
                        exportTab={exportTab}
                        setExportTab={setExportTab}
                        exporting={exporting}
                        handleExport={handleExport}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {/* Parent tabs */}
                <div className="flex items-center gap-2 px-6 pb-4 border-b">
                    <Button
                        variant={parentTab === 'dd' ? 'default' : 'outline'}
                        onClick={() => setParentTab('dd')}
                        className="flex items-center gap-2"
                    >
                        <Landmark className="h-4 w-4" />
                        Demand Draft
                    </Button>
                    <Button
                        variant={parentTab === 'portal' ? 'default' : 'outline'}
                        onClick={() => setParentTab('portal')}
                        className="flex items-center gap-2"
                    >
                        <Banknote className="h-4 w-4" />
                        Pay on Portal
                    </Button>
                    <Button
                        variant={parentTab === 'transfer' ? 'default' : 'outline'}
                        onClick={() => setParentTab('transfer')}
                        className="flex items-center gap-2"
                    >
                        <Wallet className="h-4 w-4" />
                        Bank Transfer
                    </Button>
                </div>

                <div className="pt-4">
                    {parentTab === 'dd' && renderTabContent(
                        ddSubTab, setDdSubTab, DD_TABS_CONFIG, ddTabsWithData,
                        ddData, ddTotal, ddColDefs,
                        ddSearch, setDdSearch, ddPagination, setDdPagination,
                        handleDdSort,
                    )}
                    {parentTab === 'portal' && renderTabContent(
                        portalSubTab, setPortalSubTab, PORTAL_TABS_CONFIG, portalTabsWithData,
                        portalData, portalTotal, portalColDefs,
                        portalSearch, setPortalSearch, portalPagination, setPortalPagination,
                        handlePortalSort,
                    )}
                    {parentTab === 'transfer' && renderTabContent(
                        transferSubTab, setTransferSubTab, TRANSFER_TABS_CONFIG, transferTabsWithData,
                        transferData, transferTotal, transferColDefs,
                        transferSearch, setTransferSearch, transferPagination, setTransferPagination,
                        handleTransferSort,
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TenderFeeListPage;
