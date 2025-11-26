import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { EyeIcon, Pencil, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { usePaymentRequests } from "@/hooks/api/useEmds";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/components/ui/ActionMenu";

interface IRow {
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    gstValues: number;
    tenderFees: number;
    emd: number;
    dueDate: string | Date | null;
    statusName: string;
    id: number;
    tenderId: number;
}

const index = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('pending');

    // Map tab value to status filter
    const getStatusFilter = (tab: string): string | undefined => {
        if (tab === 'pending') return 'PENDING';
        if (tab === 'sent') return 'REQUESTED';
        if (tab === 'approved') return 'APPROVED';
        if (tab === 'rejected') return 'CANCELLED';
        if (tab === 'returned') return 'RETURNED';
        return undefined;
    };

    const { data: paymentRequestsData, isLoading: isLoadingPaymentRequests, error: paymentRequestsError } = usePaymentRequests(getStatusFilter(activeTab));

    useEffect(() => {
        console.log('EMD Tenders Debug:', {
            paymentRequestsData,
            isLoadingPaymentRequests,
            paymentRequestsError,
        });
    }, [paymentRequestsData, isLoadingPaymentRequests, paymentRequestsError]);

    const emdActions: ActionItem<IRow>[] = [
        {
            label: 'Request',
            icon: <Plus className="w-4 h-4" />,
            onClick: (row: IRow) => navigate(paths.tendering.emdsTenderFeesCreate(row.tenderId)),
        },
        {
            label: 'Edit',
            icon: <Pencil className="w-4 h-4" />,
            onClick: (row: IRow) => navigate(paths.tendering.emdsTenderFeesEdit(row.tenderId)),
        },
        {
            label: 'View',
            icon: <EyeIcon className="w-4 h-4" />,
            onClick: (row: IRow) => navigate(paths.tendering.emdsTenderFeesView(row.tenderId)),
        },
    ];

    const [colDefs] = useState<ColDef<any>[]>([
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            width: 200,
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
        },
        {
            field: 'teamMemberName',
            headerName: 'Member',
            width: 150,
            cellRenderer: (params: any) => {
                const { value } = params;
                return (
                    <span>
                        {value ? value : <b className='text-gray-400'>Unassigned</b>}
                    </span>
                );
            },
        },
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'tenderFees',
            headerName: 'Tender Fee',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'emd',
            headerName: 'EMD',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 150,
            cellRenderer: (params: { value: string | Date | null }) => {
                return params.value ? formatDateTime(params.value) : '-';
            },
        },
        {
            field: 'statusName',
            headerName: 'Status',
            width: 150,
            cellRenderer: (params: any) => {
                return params.value ? (
                    <b>{params.value}</b>
                ) : (
                    <span className="text-gray-400">—</span>
                );
            },
        },
        {
            headerName: 'Actions',
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(emdActions),
            pinned: 'right',
            width: 25,
        },
    ]);

    if (isLoadingPaymentRequests) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees Requests</CardTitle>
                    <CardDescription>All EMDs, tender fees & processing fees requests listed</CardDescription>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="sent">Sent</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected</TabsTrigger>
                            <TabsTrigger value="returned">Returned</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (paymentRequestsError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees Requests</CardTitle>
                    <CardDescription>Error loading payment requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">Failed to load payment requests. Please try again.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>EMDs, Tender Fees & Processing Fees Requests</CardTitle>
                        <CardDescription>All EMDs, tender fees & processing fees requests listed</CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.tendering.tenders)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Request
                    </Button>
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="sent">Sent</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        <TabsTrigger value="returned">Returned</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={paymentRequestsData || []}
                    loading={isLoadingPaymentRequests}
                    columnDefs={colDefs}
                    gridOptions={{
                        defaultColDef: { filter: true },
                        pagination: true,
                    }}
                    enablePagination={true}
                    height="auto"
                />
            </CardContent>
        </Card>
    );
};

export default index
