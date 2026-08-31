import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const SystemHealth = lazy(() => import('@/modules/system-health'));

export default function SystemRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RouteWrapper><SystemHealth /></RouteWrapper>} />
        </Routes>
    );
}
