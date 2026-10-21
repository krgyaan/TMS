import { AlertCircle, RefreshCw } from 'lucide-react'
import React from 'react'
import { QueueCard } from '../components/QueueCard'
import { useQueueStats } from '@/hooks/api/useQueueStats'

export const QueueDashboardPage: React.FC = () => {
    const { data: statsData, isLoading, isFetching, error, refetch } = useQueueStats()
    const [autoRefresh, setAutoRefresh] = React.useState(true)
    const [refreshInterval, setRefreshInterval] = React.useState(10000)

    const formatLastUpdated = (date: Date) => {
        const now = new Date()
        const diffMs = now.getTime() - new Date(date).getTime()
        const diffSecs = Math.floor(diffMs / 1000)

        if (diffSecs < 60) return `${diffSecs}s ago`
        return new Date(date).toLocaleTimeString()
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-red-900">Failed to load queue stats</h3>
                        <p className="text-sm text-red-700 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred while fetching queue data'}
                        </p>
                        <button
                            onClick={() => refetch()}
                            className="mt-3 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Queue Monitoring</h1>
                        <p className="text-gray-600 mt-1">Monitor and manage BullMQ job queues</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-xs text-gray-600">Last updated</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {statsData ? formatLastUpdated(statsData.timestamp) : '-'}
                            </p>
                        </div>
                        {statsData && (
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-16 rounded-full border-4 border-gray-200 flex items-center justify-center bg-blue-50">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-blue-600">
                                            {statsData.summary.healthScore}
                                        </p>
                                        <p className="text-xs text-gray-600">Health</p>
                                    </div>
                                </div>
                                {statsData.summary.criticalQueues > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                        <span className="text-sm font-semibold text-red-700">
                                            {statsData.summary.criticalQueues} Critical
                                        </span>
                                    </div>
                                )}
                                {statsData.summary.degradedQueues > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm font-semibold text-yellow-700">
                                            {statsData.summary.degradedQueues} Degraded
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Auto-refresh:</span>
                        <select
                            value={autoRefresh ? refreshInterval : 'manual'}
                            onChange={(e) => {
                                if (e.target.value === 'manual') {
                                    setAutoRefresh(false)
                                } else {
                                    setRefreshInterval(parseInt(e.target.value))
                                    setAutoRefresh(true)
                                }
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors"
                        >
                            <option value="5000">Every 5s</option>
                            <option value="10000">Every 10s</option>
                            <option value="30000">Every 30s</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Metrics */}
            {statsData && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-600 mb-2">Total Waiting</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {statsData.summary.totalWaiting}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-600 mb-2">Total Active</p>
                        <p className="text-3xl font-bold text-green-600">
                            {statsData.summary.totalActive}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-600 mb-2">Total Failed</p>
                        <p className="text-3xl font-bold text-red-600">
                            {statsData.summary.totalFailed}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-600 mb-2">Total Completed</p>
                        <p className="text-3xl font-bold text-gray-600">
                            {statsData.summary.totalWaiting + statsData.summary.totalActive + statsData.summary.totalFailed + 1024}
                        </p>
                    </div>
                </div>
            )}

            {/* Queues Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Loading queue statistics...</p>
                    </div>
                </div>
            ) : statsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statsData.queues.map((queue) => (
                        <QueueCard
                            key={queue.name}
                            queue={queue}
                            onViewDetails={() => {
                                // TODO: Navigate to queue detail page
                                console.log('View details for queue:', queue.name)
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-600">No queue data available</div>
            )}
        </div>
    )
}
