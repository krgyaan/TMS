import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Accounts_Imprests = lazy(() => import('@/modules/accounts/imprests'));
const Accounts_FinancialDocs = lazy(() => import('@/modules/accounts/financial-docs'));
const Accounts_LoanAdvances = lazy(() => import('@/modules/accounts/loan-advances'));
const Accounts_TaskChecklists = lazy(() => import('@/modules/accounts/task-checlkists'));
const Accounts_GSTChecklists = lazy(() => import('@/modules/accounts/gst-checklists'));
const Accounts_FixedExpenses = lazy(() => import('@/modules/accounts/fixed-expenses'));

export default function AccountsRoutes() {
    return (
        <Routes>
            <Route path="imprests" element={<RouteWrapper><Accounts_Imprests /></RouteWrapper>} />
            <Route path="financial-docs" element={<RouteWrapper><Accounts_FinancialDocs /></RouteWrapper>} />
            <Route path="loan-advances" element={<RouteWrapper><Accounts_LoanAdvances /></RouteWrapper>} />
            <Route path="account-checklists" element={<RouteWrapper><Accounts_TaskChecklists /></RouteWrapper>} />
            <Route path="gst-checklists" element={<RouteWrapper><Accounts_GSTChecklists /></RouteWrapper>} />
            <Route path="fixed-expenses" element={<RouteWrapper><Accounts_FixedExpenses /></RouteWrapper>} />
        </Routes>
    );
}
