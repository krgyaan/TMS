import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

// Lazy imports
const Tendering_Tenders = lazy(() => import('@/modules/tendering/tenders'));
const Tender_Create = lazy(() => import('@/modules/tendering/tenders/create'));
const Tender_Edit = lazy(() => import('@/modules/tendering/tenders/edit'));
const Tender_View = lazy(() => import('@/modules/tendering/tenders/show'));
const Tendering_TenderApproval = lazy(() => import('@/modules/tendering/tenders'));
const InfoSheet_Create = lazy(() => import('@/modules/tendering/info-sheet/create'));
const Tendering_PhysDocs = lazy(() => import('@/modules/tendering/phydocs'));
const Tendering_RFQs = lazy(() => import('@/modules/tendering/rfqs'));
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
            <Route path="tender-approval" element={<RouteWrapper><Tendering_TenderApproval /></RouteWrapper>} />
            <Route path="phydocs" element={<RouteWrapper><Tendering_PhysDocs /></RouteWrapper>} />
            <Route path="rfqs" element={<RouteWrapper><Tendering_RFQs /></RouteWrapper>} />
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
