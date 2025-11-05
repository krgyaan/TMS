import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Perf_TenderExecutive = lazy(() => import('@/modules/performance/tender-executive'));
const Perf_TeamLeader = lazy(() => import('@/modules/performance/team-leader'));
const Perf_OperationTeam = lazy(() => import('@/modules/performance/operation-team'));
const Perf_AccountTeam = lazy(() => import('@/modules/performance/account-team'));
const Perf_OEM = lazy(() => import('@/modules/performance/oem-dashboard'));
const Perf_Business = lazy(() => import('@/modules/performance/business-dashboard'));
const Perf_Customer = lazy(() => import('@/modules/performance/customer-dashboard'));
const Perf_Location = lazy(() => import('@/modules/performance/location-dashboard'));

export default function PerformanceRoutes() {
    return (
        <Routes>
            <Route path="tender-executive" element={<RouteWrapper><Perf_TenderExecutive /></RouteWrapper>} />
            <Route path="team-leader" element={<RouteWrapper><Perf_TeamLeader /></RouteWrapper>} />
            <Route path="operation-team" element={<RouteWrapper><Perf_OperationTeam /></RouteWrapper>} />
            <Route path="account-team" element={<RouteWrapper><Perf_AccountTeam /></RouteWrapper>} />
            <Route path="oem-dashboard" element={<RouteWrapper><Perf_OEM /></RouteWrapper>} />
            <Route path="business-dashboard" element={<RouteWrapper><Perf_Business /></RouteWrapper>} />
            <Route path="customer-dashboard" element={<RouteWrapper><Perf_Customer /></RouteWrapper>} />
            <Route path="location-dashboard" element={<RouteWrapper><Perf_Location /></RouteWrapper>} />
        </Routes>
    );
}
