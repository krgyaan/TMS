import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const CRM_Leads        = lazy(() => import('@/modules/crm/leads/LeadsListPage'));
const CRM_LeadCreate   = lazy(() => import('@/modules/crm/leads/LeadCreatePage'));
const CRM_LeadEdit     = lazy(() => import('@/modules/crm/leads/LeadEditPage'));
const CRM_LeadShow     = lazy(() => import('@/modules/crm/leads/LeadShowPage'));
const CRM_Followup     = lazy(() => import('@/modules/crm/followups/FollowupListPage'));
const CRM_FollowupHistory = lazy(() => import('@/modules/crm/followups/FollowupShowPage'));
const CRM_Enquiries  = lazy(() => import('@/modules/crm/enquiries'));
const CRM_Costings   = lazy(() => import('@/modules/crm/costings'));
const CRM_Quotations = lazy(() => import('@/modules/crm/quotations'));

export default function CRMRoutes() {
    return (
        <Routes>
            <Route path="leads"                     element={<RouteWrapper><CRM_Leads /></RouteWrapper>} />
            <Route path="leads/create"              element={<RouteWrapper><CRM_LeadCreate /></RouteWrapper>} />
            <Route path="leads/:id/edit"            element={<RouteWrapper><CRM_LeadEdit /></RouteWrapper>} />
            <Route path="leads/:id"                 element={<RouteWrapper><CRM_LeadShow /></RouteWrapper>} />
            <Route path="followup/:leadId"          element={<RouteWrapper><CRM_Followup /></RouteWrapper>} />
            <Route path="followup/:leadId/history"  element={<RouteWrapper><CRM_FollowupHistory /></RouteWrapper>} /> 

            <Route path="enquiries"  element={<RouteWrapper><CRM_Enquiries /></RouteWrapper>} />
            <Route path="costings"   element={<RouteWrapper><CRM_Costings /></RouteWrapper>} />
            <Route path="quotations" element={<RouteWrapper><CRM_Quotations /></RouteWrapper>} />
        </Routes>
    );
}