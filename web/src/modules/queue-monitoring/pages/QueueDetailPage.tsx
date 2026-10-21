import { AlertCircle, ArrowLeft, Filter, RefreshCw } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueueDetail } from '@/hooks/api/useQueueStats'
import type { JobState } from '../types/queue.types'

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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">Queue name is required</p>
                </div>
            </div>
        )
    }

    const statusOptions: (JobState | 'all')[] = ['all', 'waiting', 'active', 'completed', 'failed', 'delayed', 'paused']

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate('/queue-monitoring')}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Queue: {queueName}</h1>
                        <p className="text-gray-600 mt-1">View and manage jobs in this queue</p>
                    </div>
                </div>

                {/* Queue Summary */}
                {data && (
                    <div className="grid grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-xs text-gray-600 mb-1">Waiting</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {data.queueStats?.counts.waiting ?? 0}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-xs text-gray-600 mb-1">Active</p>
                            <p className="text-2xl font-bold text-green-600">
                                {data.queueStats?.counts.active ?? 0}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-xs text-gray-600 mb-1">Completed</p>
                            <p className="text-2xl font-bold text-gray-600">
                                {data.queueStats?.counts.completed ?? 0}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-xs text-gray-600 mb-1">Failed</p>
                            <p className="text-2xl font-bold text-red-600">
                                {data.queueStats?.counts.failed ?? 0}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-xs text-gray-600 mb-1">Delayed</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {data.queueStats?.counts.delayed ?? 0}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters & Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <div>
                            <label className="text-sm text-gray-600">Filter by status:</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as JobState | 'all')
                                    setOffset(0)
                                }}
                                className="ml-2 px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-red-900">Failed to load queue details</h3>
                        <p className="text-sm text-red-700 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred'}
                        </p>
                    </div>
                </div>
            )}

            {/* Jobs Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Loading jobs...</p>
                    </div>
                </div>
            ) : data?.jobs.jobs && data.jobs.jobs.length > 0 ? (
                <div>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Job ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Attempts</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Progress</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.jobs.jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-3 text-sm font-mono text-gray-600 truncate max-w-xs">
                                            {job.id}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-900">{job.name}</td>
                                        <td className="px-6 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    job.state === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : job.state === 'failed'
                                                          ? 'bg-red-100 text-red-800'
                                                          : job.state === 'active'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : job.state === 'waiting'
                                                              ? 'bg-yellow-100 text-yellow-800'
                                                              : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {job.state}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600">
                                            {job.attemptsMade}/{job.attempts}
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            {job.progress !== null ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${job.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-600">{job.progress}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600">
                                            {new Date(job.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/queue-monitoring/queues/${queueName}/jobs/${job.id}`
                                                    )
                                                }
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data.jobs.total > 0 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Showing {offset + 1} to {Math.min(offset + limit, data.jobs.total)} of{' '}
                                {data.jobs.total} jobs
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                    disabled={offset === 0}
                                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {Math.floor(offset / limit) + 1} of{' '}
                                    {Math.ceil((data.jobs.total || 0) / limit)}
                                </span>
                                <button
                                    onClick={() => setOffset(offset + limit)}
                                    disabled={offset + limit >= (data.jobs.total || 0)}
                                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-600">No jobs found</p>
                </div>
            )}
        </div>
    )
}
