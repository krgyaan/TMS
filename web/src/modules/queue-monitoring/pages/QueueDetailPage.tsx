import { AlertCircle, ArrowLeft, Filter, RefreshCw } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useQueueDetail } from '@/hooks/api/useQueueStats'
import type { JobState } from '../types/queue.types'

const statusPillClass: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    default: 'bg-muted text-muted-foreground border border-border',
}

export const QueueDetailPage: React.FC = () => {
    const { queueName } = useParams<{ queueName: string }>()
    const navigate = useNavigate()
    const [statusFilter, setStatusFilter] = React.useState<JobState | 'all'>('all')
    const [limit] = React.useState(50)
    const [offset, setOffset] = React.useState(0)

    const { data, isLoading, isFetching, error, refetch } = useQueueDetail(queueName || '', {
        status: statusFilter,
        limit,
        offset,
    })

    if (!queueName) {
        return (
            <div className="p-6">
                <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4">
                    <p className="text-destructive">Queue name is required</p>
                </div>
            </div>
        )
    }

    const statusOptions: (JobState | 'all')[] = ['all', 'waiting', 'active', 'completed', 'failed', 'delayed', 'paused']

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/queue-monitoring')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Queue: {queueName}</h1>
                        <p className="text-muted-foreground mt-1">View and manage jobs in this queue</p>
                    </div>
                </div>

                {/* Queue Summary */}
                {data && (
                    <div className="grid grid-cols-5 gap-4">
                        <div className="bg-card rounded-lg border border-border p-4">
                            <p className="text-xs text-muted-foreground mb-1">Waiting</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {data.queueStats?.counts.waiting ?? 0}
                            </p>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <p className="text-xs text-muted-foreground mb-1">Active</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {data.queueStats?.counts.active ?? 0}
                            </p>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <p className="text-xs text-muted-foreground mb-1">Completed</p>
                            <p className="text-2xl font-bold text-foreground">
                                {data.queueStats?.counts.completed ?? 0}
                            </p>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <p className="text-xs text-muted-foreground mb-1">Failed</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {data.queueStats?.counts.failed ?? 0}
                            </p>
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                            <p className="text-xs text-muted-foreground mb-1">Delayed</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {data.queueStats?.counts.delayed ?? 0}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters & Actions */}
            <div className="bg-card rounded-lg border border-border p-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <label className="text-sm text-muted-foreground">Filter by status:</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as JobState | 'all')
                                    setOffset(0)
                                }}
                                className="ml-2 px-3 py-1 text-sm border border-border rounded bg-card text-foreground hover:border-muted-foreground transition-colors"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-destructive">Failed to load queue details</h3>
                        <p className="text-sm text-destructive/90 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred'}
                        </p>
                    </div>
                </div>
            )}

            {/* Jobs Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading jobs...</p>
                    </div>
                </div>
            ) : data?.jobs.jobs && data.jobs.jobs.length > 0 ? (
                <div>
                    <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Job ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Attempts</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Progress</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.jobs.jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="border-b border-border hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="px-6 py-3 text-sm font-mono text-muted-foreground truncate max-w-xs">
                                            {job.id}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-foreground">{job.name}</td>
                                        <td className="px-6 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    statusPillClass[job.state] ?? statusPillClass.default
                                                }`}
                                            >
                                                {job.state}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            {job.attemptsMade}/{job.attempts}
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            {job.progress !== null ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${job.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{job.progress}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            {new Date(job.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="px-0"
                                                onClick={() =>
                                                    navigate(
                                                        `/queue-monitoring/queues/${queueName}/jobs/${job.id}`
                                                    )
                                                }
                                            >
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data.jobs.total > 0 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {offset + 1} to {Math.min(offset + limit, data.jobs.total)} of{' '}
                                {data.jobs.total} jobs
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                    disabled={offset === 0}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {Math.floor(offset / limit) + 1} of{' '}
                                    {Math.ceil((data.jobs.total || 0) / limit)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOffset(offset + limit)}
                                    disabled={offset + limit >= (data.jobs.total || 0)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No jobs found</p>
                </div>
            )}
        </div>
    )
}
