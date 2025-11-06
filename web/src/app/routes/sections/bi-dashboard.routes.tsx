import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const BI_DemandDraft = lazy(() => import('@/modules/bi-dashboard/demand-draft'));
const BI_FDR = lazy(() => import('@/modules/bi-dashboard/fdr'));
const BI_Cheque = lazy(() => import('@/modules/bi-dashboard/cheque'));
const BI_BankGuarantee = lazy(() => import('@/modules/bi-dashboard/bank-guarantee'));
const BI_BankTransfer = lazy(() => import('@/modules/bi-dashboard/bank-tranfer'));
const BI_PayOnPortal = lazy(() => import('@/modules/bi-dashboard/pay-on-portal'));

export default function BIDashboardRoutes() {
    return (
        <Routes>
            <Route path="demand-draft" element={<RouteWrapper><BI_DemandDraft /></RouteWrapper>} />
            <Route path="fdr" element={<RouteWrapper><BI_FDR /></RouteWrapper>} />
            <Route path="cheque" element={<RouteWrapper><BI_Cheque /></RouteWrapper>} />
            <Route path="bank-guarantee" element={<RouteWrapper><BI_BankGuarantee /></RouteWrapper>} />
            <Route path="bank-transfer" element={<RouteWrapper><BI_BankTransfer /></RouteWrapper>} />
            <Route path="pay-on-portal" element={<RouteWrapper><BI_PayOnPortal /></RouteWrapper>} />
        </Routes>
    );
}
