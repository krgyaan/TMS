import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Operations_WorkOrder = lazy(() => import('@/modules/operations/work-order'));
const Operations_KickOff = lazy(() => import('@/modules/operations/kick-off'));
const Operations_ContractAgreement = lazy(() => import('@/modules/operations/contract-agreement'));

export default function OperationsRoutes() {
    return (
        <Routes>
            <Route path="work-order" element={<RouteWrapper><Operations_WorkOrder /></RouteWrapper>} />
            <Route path="kick-off" element={<RouteWrapper><Operations_KickOff /></RouteWrapper>} />
            <Route path="contract-agreement" element={<RouteWrapper><Operations_ContractAgreement /></RouteWrapper>} />
        </Routes>
    );
}
