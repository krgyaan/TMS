import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const Shared_FollowUps = lazy(() => import('@/modules/shared/follow-ups'));
const Shared_Courier = lazy(() => import('@/modules/shared/courier'));

export default function SharedRoutes() {
    return (
        <Routes>
            <Route path="follow-ups" element={<RouteWrapper><Shared_FollowUps /></RouteWrapper>} />
            <Route path="couriers" element={<RouteWrapper><Shared_Courier /></RouteWrapper>} />
        </Routes>
    );
}
