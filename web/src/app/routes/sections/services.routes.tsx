import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Services_CustomerList = lazy(() => import('@/modules/services/customer/CustomerListPage'));
const Services_CustomerCreate = lazy(() => import('@/modules/services/customer/CustomerCreatePage'));
const Services_CustomerEdit = lazy(() => import('@/modules/services/customer/CustomerEditPage'));
const Services_CustomerShow = lazy(() => import('@/modules/services/customer/CustomerShowPage'));
const Services_CustomerView = lazy(() => import('@/modules/services/customer/CustomerViewPage'));
const Services_Conference = lazy(() => import('@/modules/services/conference/ConferenceListPage'));
const Services_ConferenceCreate = lazy(() => import('@/modules/services/conference/ConferenceCreatePage'));
const Services_ConferenceView = lazy(() => import('@/modules/services/conference/ConferenceViewPage'));
const Services_ConferenceShow = lazy(() => import('@/modules/services/conference/ConferenceShowPage'));
const Services_VisitList = lazy(() => import('@/modules/services/visit/ServiceVisitListPage'));
const Services_VisitCreate = lazy(() => import('@/modules/services/visit/ServiceVisitCreatePage'));
const Services_VisitView = lazy(() => import('@/modules/services/visit/ServiceVisitViewPage'));
const Services_VisitShow = lazy(() => import('@/modules/services/visit/ServiceVisitShowPage'));
const Services_FeedbackList = lazy(() => import('@/modules/services/service-feedback/ServiceFeedbackListPage'));
const Services_FeedbackView = lazy(() => import('@/modules/services/service-feedback/ServiceFeedbackViewPage'));
const Services_FeedbackShow = lazy(() => import('@/modules/services/service-feedback/ServiceFeedbackShowPage'));
const Services_AmcList = lazy(() => import('@/modules/services/amc/AmcListPage'));
const Services_AmcCreate = lazy(() => import('@/modules/services/amc/AmcCreatePage'));
const Services_AmcEdit = lazy(() => import('@/modules/services/amc/AmcEditPage'));
const Services_AmcShow = lazy(() => import('@/modules/services/amc/AmcShowPage'));
const Services_AmcView = lazy(() => import('@/modules/services/amc/AmcViewPage'));
const Services_AmcBillingList = lazy(() => import('@/modules/services/amc-billing/AmcBillingListPage'));
const Services_AmcBillingShow = lazy(() => import('@/modules/services/amc-billing/AmcBillingShowPage'));
const Services_AmcBillingView = lazy(() => import('@/modules/services/amc-billing/AmcBillingViewPage'));
const Services_AmcBillingFollowUp = lazy(() => import('@/modules/services/amc-billing/AmcBillingFollowUpPage'));
const Services_AmcServicesList = lazy(() => import('@/modules/services/amc-services/AmcServicesListPage'));
const Services_AmcServiceShow = lazy(() => import('@/modules/services/amc-services/AmcServiceShowPage'));
const Services_AmcServiceView = lazy(() => import('@/modules/services/amc-services/AmcServiceViewPage'));

export default function ServicesRoutes() {
    return (
        <Routes>
            <Route path="customer" element={<RouteWrapper><Services_CustomerList /></RouteWrapper>} />
            <Route path="customer/create" element={<RouteWrapper><Services_CustomerCreate /></RouteWrapper>} />
            <Route path="customer/:id/edit" element={<RouteWrapper><Services_CustomerEdit /></RouteWrapper>} />
            <Route path="customer/:id/view" element={<RouteWrapper><Services_CustomerView /></RouteWrapper>} />
            <Route path="customer/:id" element={<RouteWrapper><Services_CustomerShow /></RouteWrapper>} />
            <Route path="conference" element={<RouteWrapper><Services_Conference /></RouteWrapper>} />
            <Route path="conference/create" element={<RouteWrapper><Services_ConferenceCreate /></RouteWrapper>} />
            <Route path="conference/:id/view" element={<RouteWrapper><Services_ConferenceView /></RouteWrapper>} />
            <Route path="conference/:id" element={<RouteWrapper><Services_ConferenceShow /></RouteWrapper>} />
            <Route path="visit" element={<RouteWrapper><Services_VisitList /></RouteWrapper>} />
            <Route path="visit/create" element={<RouteWrapper><Services_VisitCreate /></RouteWrapper>} />
            <Route path="visit/:id/view" element={<RouteWrapper><Services_VisitView /></RouteWrapper>} />
            <Route path="visit/:id" element={<RouteWrapper><Services_VisitShow /></RouteWrapper>} />
            <Route path="feedback" element={<RouteWrapper><Services_FeedbackList /></RouteWrapper>} />
            <Route path="feedback/:id/view" element={<RouteWrapper><Services_FeedbackView /></RouteWrapper>} />
            <Route path="feedback/:id" element={<RouteWrapper><Services_FeedbackShow /></RouteWrapper>} />
            <Route path="amc" element={<RouteWrapper><Services_AmcList /></RouteWrapper>} />
            <Route path="amc/create" element={<RouteWrapper><Services_AmcCreate /></RouteWrapper>} />
            <Route path="amc/:id/edit" element={<RouteWrapper><Services_AmcEdit /></RouteWrapper>} />
            <Route path="amc/:id/view" element={<RouteWrapper><Services_AmcView /></RouteWrapper>} />
            <Route path="amc/:id" element={<RouteWrapper><Services_AmcShow /></RouteWrapper>} />
            <Route path="amc-services" element={<RouteWrapper><Services_AmcServicesList /></RouteWrapper>} />
            <Route path="amc-services/:id/view" element={<RouteWrapper><Services_AmcServiceView /></RouteWrapper>} />
            <Route path="amc-services/:id" element={<RouteWrapper><Services_AmcServiceShow /></RouteWrapper>} />
            <Route path="amc-billing" element={<RouteWrapper><Services_AmcBillingList /></RouteWrapper>} />
            <Route path="amc-billing/:id/view" element={<RouteWrapper><Services_AmcBillingView /></RouteWrapper>} />
            <Route path="amc-billing/:id/follow-up" element={<RouteWrapper><Services_AmcBillingFollowUp /></RouteWrapper>} />
            <Route path="amc-billing/:id" element={<RouteWrapper><Services_AmcBillingShow /></RouteWrapper>} />
        </Routes>
    );
}
