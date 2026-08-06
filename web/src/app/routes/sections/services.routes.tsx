import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Services_Customer = lazy(() => import('@/modules/services/customer'));
const Services_Conference = lazy(() => import('@/modules/services/conference'));
const Services_Visit = lazy(() => import('@/modules/services/visit'));
const Services_AmcList = lazy(() => import('@/modules/services/amc/AmcListPage'));
const Services_AmcCreate = lazy(() => import('@/modules/services/amc/AmcCreatePage'));
const Services_AmcEdit = lazy(() => import('@/modules/services/amc/AmcEditPage'));
const Services_AmcShow = lazy(() => import('@/modules/services/amc/AmcShowPage'));
const Services_AmcView = lazy(() => import('@/modules/services/amc/AmcViewPage'));
const Services_AmcBillingList = lazy(() => import('@/modules/services/amc-billing/AmcBillingListPage'));
const Services_AmcBillingShow = lazy(() => import('@/modules/services/amc-billing/AmcBillingShowPage'));

export default function ServicesRoutes() {
    return (
        <Routes>
            <Route path="customer" element={<RouteWrapper><Services_Customer /></RouteWrapper>} />
            <Route path="conference" element={<RouteWrapper><Services_Conference /></RouteWrapper>} />
            <Route path="visit" element={<RouteWrapper><Services_Visit /></RouteWrapper>} />
            <Route path="amc" element={<RouteWrapper><Services_AmcList /></RouteWrapper>} />
            <Route path="amc/create" element={<RouteWrapper><Services_AmcCreate /></RouteWrapper>} />
            <Route path="amc/:id/edit" element={<RouteWrapper><Services_AmcEdit /></RouteWrapper>} />
            <Route path="amc/:id/view" element={<RouteWrapper><Services_AmcView /></RouteWrapper>} />
            <Route path="amc/:id" element={<RouteWrapper><Services_AmcShow /></RouteWrapper>} />
            <Route path="amc-billing" element={<RouteWrapper><Services_AmcBillingList /></RouteWrapper>} />
            <Route path="amc-billing/:id" element={<RouteWrapper><Services_AmcBillingShow /></RouteWrapper>} />
        </Routes>
    );
}
