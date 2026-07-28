import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const CRM_Leads        = lazy(() => import('@/modules/crm/leads/LeadsListPage'));
const CRM_LeadCreate   = lazy(() => import('@/modules/crm/leads/LeadCreatePage'));
const CRM_LeadEdit     = lazy(() => import('@/modules/crm/leads/LeadEditPage'));
const CRM_LeadShow     = lazy(() => import('@/modules/crm/leads/LeadShowPage'));
const CRM_Followup     = lazy(() => import('@/modules/crm/followups/FollowupListPage'));
const CRM_FollowupHistory = lazy(() => import('@/modules/crm/followups/FollowupShowPage'));
const CRM_Enquiries       = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryListPage'));
const CRM_EnquiryCreate   = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryCreatePage'));
const CRM_EnquiryEdit     = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryEditPage'));
const CRM_EnquiryShow     = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryShowPage'));
const CRM_EnquiryCostings     = lazy(() => import('@/modules/crm/enquirycosting/EnquiryCostingListPage'));
const CRM_EnquiryCostingShow  = lazy(() => import('@/modules/crm/enquirycosting/EnquiryCostingShowPage'));
const CRM_Quotations          = lazy(() => import('@/modules/crm/quotations'));

export default function CRMRoutes() {
    return (
        <Routes>
            <Route path="leads"                     element={<RouteWrapper><CRM_Leads /></RouteWrapper>} />
            <Route path="leads/create"              element={<RouteWrapper><CRM_LeadCreate /></RouteWrapper>} />
            <Route path="leads/:id/edit"            element={<RouteWrapper><CRM_LeadEdit /></RouteWrapper>} />
            <Route path="leads/:id"                 element={<RouteWrapper><CRM_LeadShow /></RouteWrapper>} />
            <Route path="followup/:leadId"          element={<RouteWrapper><CRM_Followup /></RouteWrapper>} />
            <Route path="followup/:leadId/history"  element={<RouteWrapper><CRM_FollowupHistory /></RouteWrapper>} /> 

            <Route path="enquiry/create/:leadId"  element={<RouteWrapper><CRM_EnquiryCreate /></RouteWrapper>} />
            <Route path="enquiries"              element={<RouteWrapper><CRM_Enquiries /></RouteWrapper>} />
            <Route path="enquiries/create"       element={<RouteWrapper><CRM_EnquiryCreate /></RouteWrapper>} />
            <Route path="enquiries/:id/edit"     element={<RouteWrapper><CRM_EnquiryEdit /></RouteWrapper>} />
            <Route path="enquiries/:id"          element={<RouteWrapper><CRM_EnquiryShow /></RouteWrapper>} />
            <Route path="enquiry-costings"          element={<RouteWrapper><CRM_EnquiryCostings /></RouteWrapper>} />
            <Route path="enquiry-costings/:id"     element={<RouteWrapper><CRM_EnquiryCostingShow /></RouteWrapper>} />
            <Route path="quotations"               element={<RouteWrapper><CRM_Quotations /></RouteWrapper>} />
        </Routes>
    );
}