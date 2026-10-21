import { AlertCircle, RefreshCw } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { QueueCard } from '../components/QueueCard'
import { useQueueStats } from '@/hooks/api/useQueueStats'

export const QueueDashboardPage: React.FC = () => {
    const navigate = useNavigate()
    const [autoRefresh, setAutoRefresh] = React.useState(true)
    const [refreshInterval, setRefreshInterval] = React.useState(10000)

    const { data: statsData, isLoading, isFetching, error, refetch } = useQueueStats({
        refetchInterval: autoRefresh ? refreshInterval : false,
    })

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
                <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-destructive">Failed to load queue stats</h3>
                        <p className="text-sm text-destructive/90 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred while fetching queue data'}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Queue Monitoring</h1>
                        <p className="text-muted-foreground mt-1">Monitor and manage BullMQ job queues</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground">Last updated</p>
                            <p className="text-sm font-semibold text-foreground">
                                {statsData ? formatLastUpdated(statsData.timestamp) : '-'}
                            </p>
                        </div>
                        {statsData && (
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-16 rounded-full border-4 border-border flex items-center justify-center bg-blue-500/10">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {statsData.summary.healthScore}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Health</p>
                                    </div>
                                </div>
                                {statsData.summary.criticalQueues > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                            {statsData.summary.criticalQueues} Critical
                                        </span>
                                    </div>
                                )}
                                {statsData.summary.degradedQueues > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                            {statsData.summary.degradedQueues} Degraded
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Auto-refresh:</span>
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
                            className="px-3 py-1 text-sm border border-border rounded bg-card text-foreground hover:border-muted-foreground transition-colors"
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
                    <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">Total Waiting</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {statsData.summary.totalWaiting}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">Total Active</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {statsData.summary.totalActive}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">Total Failed</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {statsData.summary.totalFailed}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">Total Completed</p>
                        <p className="text-3xl font-bold text-foreground">
                            {statsData.queues.reduce((sum, queue) => sum + queue.counts.completed, 0)}
                        </p>
                    </div>
                </div>
            )}

            {/* Queues Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading queue statistics...</p>
                    </div>
                </div>
            ) : statsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statsData.queues.map((queue) => (
                        <QueueCard
                            key={queue.name}
                            queue={queue}
                            onViewDetails={() => navigate(`/queue-monitoring/queues/${queue.name}`)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground">No queue data available</div>
            )}
        </div>
    )
}
