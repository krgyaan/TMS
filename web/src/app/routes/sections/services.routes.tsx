import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Services_Customer = lazy(() => import('@/modules/services/customer'));
const Services_Conference = lazy(() => import('@/modules/services/conference'));
const Services_Visit = lazy(() => import('@/modules/services/visit'));
const Services_AMC = lazy(() => import('@/modules/services/amc'));

export default function ServicesRoutes() {
    return (
        <Routes>
            <Route path="customer" element={<RouteWrapper><Services_Customer /></RouteWrapper>} />
            <Route path="conference" element={<RouteWrapper><Services_Conference /></RouteWrapper>} />
            <Route path="visit" element={<RouteWrapper><Services_Visit /></RouteWrapper>} />
            <Route path="amc" element={<RouteWrapper><Services_AMC /></RouteWrapper>} />
        </Routes>
    );
}
