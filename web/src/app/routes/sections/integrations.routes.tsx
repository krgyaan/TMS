import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Integrations_Google = lazy(() => import('@/modules/integrations/google'));
const Integrations_GoogleStatus = lazy(() => import('@/modules/integrations/google/status'));

export default function IntegrationsRoutes() {
    return (
        <Routes>
            <Route path="google" element={<RouteWrapper><Integrations_Google /></RouteWrapper>} />
            <Route path="google/status" element={<RouteWrapper><Integrations_GoogleStatus /></RouteWrapper>} />
        </Routes>
    );
}
