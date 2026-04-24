import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Accounts_Imprests = lazy(() => import("@/modules/accounts/imprest/ImprestAdminIndex"));
const Accounts_FinancialDocs = lazy(() => import("@/modules/accounts/financial-docs"));
const Accounts_LoanAdvances = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceListPage"));
const Accounts_LoanAdvances_Create = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceCreatePage"));
const Accounts_LoanAdvances_Edit = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceEditPage"));
const Accounts_LoanAdvances_View = lazy(() => import("@/modules/accounts/loan-advances/LoanAdvanceShowPage"));
const Accounts_LoanAdvances_Emi = lazy(() => import("@/modules/accounts/loan-advances/LoanEmiPage"));
const Accounts_LoanAdvances_Tds = lazy(() => import("@/modules/accounts/loan-advances/LoanTdsPage"));
const Accounts_LoanAdvances_Closure = lazy(() => import("@/modules/accounts/loan-advances/LoanClosurePage"));
const Accounts_GSTChecklists = lazy(() => import("@/modules/accounts/gst-checklists"));
const Accounts_FixedExpenses = lazy(() => import("@/modules/accounts/fixed-expenses"));

const TaskChecklistDashboard = lazy(() => import("@/modules/accounts/task-checklist/ChecklistDashboard"));
const TaskChecklistCreate = lazy(() => import("@/modules/accounts/task-checklist/ChecklistCreate"));
const TaskChecklistEdit = lazy(() => import("@/modules/accounts/task-checklist/ChecklistEdit"));
const TaskChecklistView = lazy(() => import("@/modules/accounts/task-checklist/ChecklistView"));
const TaskChecklistReport = lazy(() => import("@/modules/accounts/task-checklist/ChecklistReport"));

const Imprest_Admin_UserView = lazy(() => import("@/modules/accounts/imprest/ImprestAdminUserView"));

const TaskDashboard = lazy(() => import("@/modules/accounts/delegation/TaskDashboard"));
const AddTask = lazy(() => import("@/modules/accounts/delegation/AddTask"));
const TaskDetail = lazy(() => import("@/modules/accounts/delegation/TaskDetail"));
const TaskStatusUpdate = lazy(() => import("@/modules/accounts/delegation/TaskStatusUpdate"));

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
            <Route path="loan-advances/emis/:id" element={<RouteWrapper><Accounts_LoanAdvances_Emi /></RouteWrapper>} />
            <Route path="loan-advances/tds/:id" element={<RouteWrapper><Accounts_LoanAdvances_Tds /></RouteWrapper>} />
            <Route path="loan-advances/closure/:id" element={<RouteWrapper><Accounts_LoanAdvances_Closure /></RouteWrapper>} />
            <Route path="account-checklists" element={<RouteWrapper><TaskChecklistDashboard /></RouteWrapper>} />
            <Route path="gst-checklists" element={<RouteWrapper><Accounts_GSTChecklists /></RouteWrapper>} />
            <Route path="fixed-expenses" element={<RouteWrapper><Accounts_FixedExpenses /></RouteWrapper>} />

            <Route path="task-checklists" element={<RouteWrapper><TaskChecklistDashboard /></RouteWrapper>} />
            <Route path="task-checklists/create" element={<RouteWrapper><TaskChecklistCreate /></RouteWrapper>} />
            <Route path="task-checklists/:id/edit" element={<RouteWrapper><TaskChecklistEdit /></RouteWrapper>} />
            <Route path="task-checklists/:id/view" element={<RouteWrapper><TaskChecklistView /></RouteWrapper>} />
            <Route path="task-checklists/:id/report" element={<RouteWrapper><TaskChecklistReport /></RouteWrapper>} />

            <Route path="delegation" element={<RouteWrapper><TaskDashboard /></RouteWrapper>} />
            <Route path="delegation/add" element={<RouteWrapper><AddTask /></RouteWrapper>} />
            <Route path="delegation/:id" element={<RouteWrapper><TaskDetail /></RouteWrapper>} />
            <Route path="delegation/:id/update" element={<RouteWrapper><TaskStatusUpdate /></RouteWrapper>} />
        </Routes>
    );
}
