import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

// Lazy imports
const DocumentDashboard_PQR = lazy(() => import('@/modules/shared/pqr/PqrListPage'));
const DocumentDashboard_PQR_Create = lazy(() => import('@/modules/shared/pqr/PqrCreatePage'));
const DocumentDashboard_PQR_Edit = lazy(() => import('@/modules/shared/pqr/PqrEditPage'));
const DocumentDashboard_PQR_Show = lazy(() => import('@/modules/shared/pqr/PqrShowPage'));
const DocumentDashboard_FinanceDocument = lazy(() => import('@/modules/shared/finance-document/FinanceDocumentListPage'));
const DocumentDashboard_FinanceDocument_Create = lazy(() => import('@/modules/shared/finance-document/FinanceDocumentCreatePage'));
const DocumentDashboard_FinanceDocument_Edit = lazy(() => import('@/modules/shared/finance-document/FinanceDocumentEditPage'));
const DocumentDashboard_FinanceDocument_Show = lazy(() => import('@/modules/shared/finance-document/FinanceDocumentShowPage'));
const DocumentDashboard_Projects = lazy(() => import('@/modules/shared/master-project/ProjectsListPage'));
const DocumentDashboard_Projects_Create = lazy(() => import('@/modules/shared/master-project/ProjectsCreatePage'));
const DocumentDashboard_Projects_Edit = lazy(() => import('@/modules/shared/master-project/ProjectsEditPage'));
const DocumentDashboard_Projects_Show = lazy(() => import('@/modules/shared/master-project/ProjectsShowPage'));

export default function DocumentDashboardRoutes() {
    return (
        <Routes>
            <Route path="pqr" element={<RouteWrapper><DocumentDashboard_PQR /></RouteWrapper>} />
            <Route path="pqr/create" element={<RouteWrapper><DocumentDashboard_PQR_Create /></RouteWrapper>} />
            <Route path="pqr/:id/edit" element={<RouteWrapper><DocumentDashboard_PQR_Edit /></RouteWrapper>} />
            <Route path="pqr/:id" element={<RouteWrapper><DocumentDashboard_PQR_Show /></RouteWrapper>} />
            <Route path="finance-document" element={<RouteWrapper><DocumentDashboard_FinanceDocument /></RouteWrapper>} />
            <Route path="finance-document/create" element={<RouteWrapper><DocumentDashboard_FinanceDocument_Create /></RouteWrapper>} />
            <Route path="finance-document/:id/edit" element={<RouteWrapper><DocumentDashboard_FinanceDocument_Edit /></RouteWrapper>} />
            <Route path="finance-document/:id" element={<RouteWrapper><DocumentDashboard_FinanceDocument_Show /></RouteWrapper>} />
            <Route path="projects" element={<RouteWrapper><DocumentDashboard_Projects /></RouteWrapper>} />
            <Route path="projects/create" element={<RouteWrapper><DocumentDashboard_Projects_Create /></RouteWrapper>} />
            <Route path="projects/:id/edit" element={<RouteWrapper><DocumentDashboard_Projects_Edit /></RouteWrapper>} />
            <Route path="projects/:id" element={<RouteWrapper><DocumentDashboard_Projects_Show /></RouteWrapper>} />
        </Routes>
    );
}
