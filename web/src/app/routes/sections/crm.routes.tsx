import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const CRM_Leads = lazy(() => import('@/modules/crm/leads'));
const CRM_Enquiries = lazy(() => import('@/modules/crm/enquiries'));
const CRM_Costings = lazy(() => import('@/modules/crm/costings'));
const CRM_Quotations = lazy(() => import('@/modules/crm/quotations'));

export default function CRMRoutes() {
    return (
        <Routes>
            <Route path="leads" element={<RouteWrapper><CRM_Leads /></RouteWrapper>} />
            <Route path="enquiries" element={<RouteWrapper><CRM_Enquiries /></RouteWrapper>} />
            <Route path="costings" element={<RouteWrapper><CRM_Costings /></RouteWrapper>} />
            <Route path="quotations" element={<RouteWrapper><CRM_Quotations /></RouteWrapper>} />
        </Routes>
    );
}
