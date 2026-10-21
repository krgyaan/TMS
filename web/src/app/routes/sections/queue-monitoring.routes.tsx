import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteWrapper } from '../components/RouteWrapper';

const QueueDashboardPage = lazy(() =>
    import('@/modules/queue-monitoring/pages/QueueDashboardPage').then((m) => ({
        default: m.QueueDashboardPage,
    }))
);

const QueueDetailPage = lazy(() =>
    import('@/modules/queue-monitoring/pages/QueueDetailPage').then((m) => ({
        default: m.QueueDetailPage,
    }))
);

const JobDetailPage = lazy(() =>
    import('@/modules/queue-monitoring/pages/JobDetailPage').then((m) => ({
        default: m.JobDetailPage,
    }))
);

export default function QueueMonitoringRoutes() {
    return (
        <Routes>
            {/* Main dashboard: /queue-monitoring */}
            <Route
                path="/"
                element={
                    <RouteWrapper>
                        <QueueDashboardPage />
                    </RouteWrapper>
                }
            />

            {/* Queue detail: /queue-monitoring/queues/:queueName */}
            <Route
                path="queues/:queueName"
                element={
                    <RouteWrapper>
                        <QueueDetailPage />
                    </RouteWrapper>
                }
            />

            {/* Job detail: /queue-monitoring/queues/:queueName/jobs/:jobId */}
            <Route
                path="queues/:queueName/jobs/:jobId"
                element={
                    <RouteWrapper>
                        <JobDetailPage />
                    </RouteWrapper>
                }
            />
        </Routes>
    );
}
