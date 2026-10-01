import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const SystemHealth = lazy(() => import('@/modules/system-health'));
const TenderCostsPage = lazy(() => import('@/modules/system-health/TenderCostsPage'));

export default function SystemRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RouteWrapper><SystemHealth /></RouteWrapper>} />
            <Route path="tender-costs" element={<RouteWrapper><TenderCostsPage /></RouteWrapper>} />
        </Routes>
    );
}

