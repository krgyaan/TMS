import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const CRM_Leads        = lazy(() => import('@/modules/crm/leads/LeadsListPage'));
const CRM_LeadCreate   = lazy(() => import('@/modules/crm/leads/LeadCreatePage'));
const CRM_LeadEdit     = lazy(() => import('@/modules/crm/leads/LeadEditPage'));
const CRM_LeadShow     = lazy(() => import('@/modules/crm/leads/LeadShowPage'));
const CRM_LeadFollowup = lazy(() => import('@/modules/crm/leadfollowup/LeadFollowupListPage'));
const CRM_Enquiries       = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryListPage'));
const CRM_EnquiryCreate   = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryCreatePage'));
const CRM_EnquiryWithLeadCreate = lazy(() => import('@/modules/crm/lead-enquiry/EnquiryWithLeadCreatePage'));
const CRM_EnquiryEdit     = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryEditPage'));
const CRM_EnquiryShow     = lazy(() => import('@/modules/crm/lead-enquiry/LeadEnquiryShowPage'));
const CRM_EnquiryQuotationFollowup = lazy(() => import('@/modules/crm/lead-enquiry/EnquiryQuotationFollowupPage'));
const CRM_HappyCalling       = lazy(() => import('@/modules/crm/happy-calling/HappyCallingListPage'));
const CRM_HappyCallingCreate = lazy(() => import('@/modules/crm/happy-calling/HappyCallingCreatePage'));
const CRM_HappyCallingShow   = lazy(() => import('@/modules/crm/happy-calling/HappyCallingShowPage'));
const CRM_HappyCallingEdit   = lazy(() => import('@/modules/crm/happy-calling/HappyCallingEditPage'));
const CRM_HappyCallingFollowup = lazy(() => import('@/modules/crm/happy-calling/HappyCallingFollowupPage'));
const CRM_HappyCallingEnquiryCreate = lazy(() => import('@/modules/crm/happy-calling/HappyCallingEnquiryCreatePage'));

export default function CRMRoutes() {
    return (
        <Routes>
            <Route path="leads"                     element={<RouteWrapper><CRM_Leads /></RouteWrapper>} />
            <Route path="leads/create"              element={<RouteWrapper><CRM_LeadCreate /></RouteWrapper>} />
            <Route path="leads/:id/edit"            element={<RouteWrapper><CRM_LeadEdit /></RouteWrapper>} />
            <Route path="leads/:id"                 element={<RouteWrapper><CRM_LeadShow /></RouteWrapper>} />
            <Route path="followup/:leadId"          element={<RouteWrapper><CRM_LeadFollowup /></RouteWrapper>} />

            <Route path="enquiry/create/:leadId"  element={<RouteWrapper><CRM_EnquiryCreate /></RouteWrapper>} />
            <Route path="enquiries"              element={<RouteWrapper><CRM_Enquiries /></RouteWrapper>} />
            <Route path="enquiries/create"       element={<RouteWrapper><CRM_EnquiryWithLeadCreate /></RouteWrapper>} />
            <Route path="enquiries/:id/edit"     element={<RouteWrapper><CRM_EnquiryEdit /></RouteWrapper>} />
            <Route path="enquiries/:id/quotation-followup" element={<RouteWrapper><CRM_EnquiryQuotationFollowup /></RouteWrapper>} />
            <Route path="enquiries/:id"          element={<RouteWrapper><CRM_EnquiryShow /></RouteWrapper>} />

            <Route path="happy-calling"            element={<RouteWrapper><CRM_HappyCalling /></RouteWrapper>} />
            <Route path="happy-calling/create/:clientId" element={<RouteWrapper><CRM_HappyCallingCreate /></RouteWrapper>} />
            <Route path="happy-calling/enquiry/create/:id" element={<RouteWrapper><CRM_HappyCallingEnquiryCreate /></RouteWrapper>} />
            <Route path="happy-calling/followup/:id" element={<RouteWrapper><CRM_HappyCallingFollowup /></RouteWrapper>} />
            <Route path="happy-calling/:id"         element={<RouteWrapper><CRM_HappyCallingShow /></RouteWrapper>} />
            <Route path="happy-calling/:id/edit"    element={<RouteWrapper><CRM_HappyCallingEdit /></RouteWrapper>} />
        </Routes>
    );
}