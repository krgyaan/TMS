import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

// Lazy imports
const Tendering_Tenders = lazy(() => import('@/modules/tendering/tenders'));
const Tender_Create = lazy(() => import('@/modules/tendering/tenders/create'));
const Tender_Edit = lazy(() => import('@/modules/tendering/tenders/edit'));
const Tender_View = lazy(() => import('@/modules/tendering/tenders/show'));
const Tendering_TenderApproval = lazy(() => import('@/modules/tendering/tender-approval'));
const Tendering_TenderApproval_Create = lazy(() => import('@/modules/tendering/tender-approval/create'));
const Tendering_TenderApproval_Show = lazy(() => import('@/modules/tendering/tender-approval/show'));
const InfoSheet_Create = lazy(() => import('@/modules/tendering/info-sheet/create'));
const InfoSheet_Edit = lazy(() => import('@/modules/tendering/info-sheet/edit'));
const Tendering_PhysicalDocs = lazy(() => import('@/modules/tendering/physical-docs'));
const Tendering_PhysicalDocs_Create = lazy(() => import('@/modules/tendering/physical-docs/create'));
const Tendering_PhysicalDocs_Edit = lazy(() => import('@/modules/tendering/physical-docs/edit'));
const Tendering_PhysicalDocs_Show = lazy(() => import('@/modules/tendering/physical-docs/show'));
const Tendering_RFQs = lazy(() => import('@/modules/tendering/rfqs'));
const Tendering_RFQs_Create = lazy(() => import('@/modules/tendering/rfqs/create'));
const Tendering_RFQs_Edit = lazy(() => import('@/modules/tendering/rfqs/edit'));
const Tendering_RFQs_Show = lazy(() => import('@/modules/tendering/rfqs/show'));
const Tendering_EMD = lazy(() => import('@/modules/tendering/emds-tenderfees'));
const Tendering_DocChecklist = lazy(() => import('@/modules/tendering/checklists'));
const Tendering_CostingSheets = lazy(() => import('@/modules/tendering/costing-sheets'));
const Tendering_CostingApproval = lazy(() => import('@/modules/tendering/costing-sheets'));
const Tendering_BidSubmissions = lazy(() => import('@/modules/tendering/bid-submissions'));
const Tendering_TQs = lazy(() => import('@/modules/tendering/tqs'));
const Tendering_RAs = lazy(() => import('@/modules/tendering/ras'));
const Tendering_Results = lazy(() => import('@/modules/tendering/results'));

export default function TenderingRoutes() {
    return (
        <Routes>
            <Route path="tenders" element={<RouteWrapper><Tendering_Tenders /></RouteWrapper>} />
            <Route path="tenders/create" element={<RouteWrapper><Tender_Create /></RouteWrapper>} />
            <Route path="tenders/:id/edit" element={<RouteWrapper><Tender_Edit /></RouteWrapper>} />
            <Route path="tenders/:id" element={<RouteWrapper><Tender_View /></RouteWrapper>} />
            <Route path="info-sheet/create/:tenderId" element={<RouteWrapper><InfoSheet_Create /></RouteWrapper>} />
            <Route path="info-sheet/edit/:tenderId" element={<RouteWrapper><InfoSheet_Edit /></RouteWrapper>} />
            <Route path="tender-approval" element={<RouteWrapper><Tendering_TenderApproval /></RouteWrapper>} />
            <Route path="tender-approval/create/:tenderId" element={<RouteWrapper><Tendering_TenderApproval_Create /></RouteWrapper>} />
            <Route path="tender-approval/:id" element={<RouteWrapper><Tendering_TenderApproval_Show /></RouteWrapper>} />
            <Route path="physical-docs" element={<RouteWrapper><Tendering_PhysicalDocs /></RouteWrapper>} />
            <Route path="physical-docs/create/:id" element={<RouteWrapper><Tendering_PhysicalDocs_Create /></RouteWrapper>} />
            <Route path="physical-docs/:id/edit" element={<RouteWrapper><Tendering_PhysicalDocs_Edit /></RouteWrapper>} />
            <Route path="physical-docs/:id" element={<RouteWrapper><Tendering_PhysicalDocs_Show /></RouteWrapper>} />
            <Route path="rfqs" element={<RouteWrapper><Tendering_RFQs /></RouteWrapper>} />
            <Route path="rfqs/create/:id" element={<RouteWrapper><Tendering_RFQs_Create /></RouteWrapper>} />
            <Route path="rfqs/:id/edit" element={<RouteWrapper><Tendering_RFQs_Edit /></RouteWrapper>} />
            <Route path="rfqs/:id" element={<RouteWrapper><Tendering_RFQs_Show /></RouteWrapper>} />
            <Route path="emds-tenderfees" element={<RouteWrapper><Tendering_EMD /></RouteWrapper>} />
            <Route path="checklists" element={<RouteWrapper><Tendering_DocChecklist /></RouteWrapper>} />
            <Route path="costing-sheets" element={<RouteWrapper><Tendering_CostingSheets /></RouteWrapper>} />
            <Route path="costing-approval" element={<RouteWrapper><Tendering_CostingApproval /></RouteWrapper>} />
            <Route path="bid-submissions" element={<RouteWrapper><Tendering_BidSubmissions /></RouteWrapper>} />
            <Route path="tqs" element={<RouteWrapper><Tendering_TQs /></RouteWrapper>} />
            <Route path="ras" element={<RouteWrapper><Tendering_RAs /></RouteWrapper>} />
            <Route path="results" element={<RouteWrapper><Tendering_Results /></RouteWrapper>} />
        </Routes>
    );
}
