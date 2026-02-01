import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const BI_DemandDraft = lazy(() => import('@/modules/bi-dashboard/demand-draft/DemandDraftListPage'));
const BI_FDR = lazy(() => import('@/modules/bi-dashboard/fdr/FdrListPage'));
const BI_Cheque = lazy(() => import('@/modules/bi-dashboard/cheque/ChequeListPage'));
const BI_BankGuarantee = lazy(() => import('@/modules/bi-dashboard/bank-guarantee/BankGuaranteeListPage'));
const BI_BankTransfer = lazy(() => import('@/modules/bi-dashboard/bank-tranfer/BankTransferListPage'));
const BI_PayOnPortal = lazy(() => import('@/modules/bi-dashboard/pay-on-portal/PayOnPortalListPage'));

const BI_BankGuaranteeAction = lazy(() => import('@/modules/bi-dashboard/bank-guarantee/BankGuaranteeActionPage'));
const BI_FdrAction = lazy(() => import('@/modules/bi-dashboard/fdr/FdrActionPage'));
const BI_DemandDraftAction = lazy(() => import('@/modules/bi-dashboard/demand-draft/DemandDraftActionPage'));
const BI_ChequeAction = lazy(() => import('@/modules/bi-dashboard/cheque/ChequeActionPage'));
const BI_PayOnPortalAction = lazy(() => import('@/modules/bi-dashboard/pay-on-portal/PayOnPortalActionPage'));
const BI_BankTransferAction = lazy(() => import('@/modules/bi-dashboard/bank-tranfer/BankTransferActionPage'));

export default function BIDashboardRoutes() {
    return (
        <Routes>
            <Route path="demand-draft" element={<RouteWrapper><BI_DemandDraft /></RouteWrapper>} />
            <Route path="fdr" element={<RouteWrapper><BI_FDR /></RouteWrapper>} />
            <Route path="cheque" element={<RouteWrapper><BI_Cheque /></RouteWrapper>} />
            <Route path="bank-guarantee" element={<RouteWrapper><BI_BankGuarantee /></RouteWrapper>} />
            <Route path="bank-transfer" element={<RouteWrapper><BI_BankTransfer /></RouteWrapper>} />
            <Route path="pay-on-portal" element={<RouteWrapper><BI_PayOnPortal /></RouteWrapper>} />
            <Route path="bank-guarantee/action/:id" element={<RouteWrapper><BI_BankGuaranteeAction /></RouteWrapper>} />
            <Route path="fdr/action/:id" element={<RouteWrapper><BI_FdrAction /></RouteWrapper>} />
            <Route path="demand-draft/action/:id" element={<RouteWrapper><BI_DemandDraftAction /></RouteWrapper>} />
            <Route path="cheque/action/:id" element={<RouteWrapper><BI_ChequeAction /></RouteWrapper>} />
            <Route path="pay-on-portal/action/:id" element={<RouteWrapper><BI_PayOnPortalAction /></RouteWrapper>} />
            <Route path="bank-transfer/action/:id" element={<RouteWrapper><BI_BankTransferAction /></RouteWrapper>} />
        </Routes>
    );
}
