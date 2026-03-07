import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Accounts_Imprests = lazy(() => import("@/modules/accounts/imprest/ImprestAdminIndex"));
const Accounts_FinancialDocs = lazy(() => import("@/modules/accounts/financial-docs"));
const Accounts_LoanAdvances = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceListPage"));
const Accounts_LoanAdvances_Create = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceCreatePage"));
const Accounts_LoanAdvances_Edit = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceEditPage"));
const Accounts_LoanAdvances_View = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceShowPage"));
const Accounts_TaskChecklists = lazy(() => import("@/modules/accounts/task-checlkists"));
const Accounts_GSTChecklists = lazy(() => import("@/modules/accounts/gst-checklists"));
const Accounts_FixedExpenses = lazy(() => import("@/modules/accounts/fixed-expenses"));

const Imprest_Admin_UserView = lazy(() => import("@/modules/accounts/imprest/ImprestAdminUserView"));

export default function AccountsRoutes() {
    return (
        <Routes>
            <Route path="imprests" element={<RouteWrapper><Accounts_Imprests /></RouteWrapper>} />
            <Route path="imprests/user/:userId" element={<RouteWrapper><Imprest_Admin_UserView /></RouteWrapper>} />
            {/* <Route path="imprests/payment-history" element={<ImprestPaymentHistoryPage />} />
            <Route path="imprests/voucher" element={<ImprestVoucherPage />} /> */}
            <Route path="financial-docs" element={<RouteWrapper><Accounts_FinancialDocs /></RouteWrapper>} />
            <Route path="loan-advances" element={<RouteWrapper><Accounts_LoanAdvances /></RouteWrapper>} />
            <Route path="loan-advances/create" element={<RouteWrapper><Accounts_LoanAdvances_Create /></RouteWrapper>} />
            <Route path="loan-advances/:id/edit" element={<RouteWrapper><Accounts_LoanAdvances_Edit /></RouteWrapper>} />
            <Route path="loan-advances/:id" element={<RouteWrapper><Accounts_LoanAdvances_View /></RouteWrapper>} />
            <Route path="account-checklists" element={<RouteWrapper><Accounts_TaskChecklists /></RouteWrapper>} />
            <Route path="gst-checklists" element={<RouteWrapper><Accounts_GSTChecklists /></RouteWrapper>} />
            <Route path="fixed-expenses" element={<RouteWrapper><Accounts_FixedExpenses /></RouteWrapper>} />
        </Routes>
    );
}
