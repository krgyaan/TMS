import { AlertCircle, ArrowLeft, Copy, RefreshCw } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJobDetail } from '@/hooks/api/useQueueStats'

export const JobDetailPage: React.FC = () => {
    const { queueName, jobId } = useParams<{ queueName: string; jobId: string }>()
    const navigate = useNavigate()

    const { data: job, isLoading, isFetching, error, refetch } = useJobDetail(queueName || '', jobId || '')

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const formatJson = (obj: any) => {
        return JSON.stringify(obj, null, 2)
    }

    if (!queueName || !jobId) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">Queue name and job ID are required</p>
                </div>
            </div>
        )
    }

    const statusColorMap = {
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        active: 'bg-blue-100 text-blue-800',
        waiting: 'bg-yellow-100 text-yellow-800',
        delayed: 'bg-purple-100 text-purple-800',
        paused: 'bg-gray-100 text-gray-800',
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate(`/queue-monitoring/queues/${queueName}`)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
                        <p className="text-gray-600 mt-1">
                            {queueName} / <span className="font-mono text-sm">{jobId}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-red-900">Failed to load job details</h3>
                        <p className="text-sm text-red-700 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred'}
                        </p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Loading job details...</p>
                    </div>
                </div>
            ) : job ? (
                <div className="space-y-6">
                    {/* Status Overview */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Status</p>
                                <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        statusColorMap[job.state as keyof typeof statusColorMap] ||
                                        'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    {job.state}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Attempts</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {job.attemptsMade}/{job.attempts}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Progress</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {job.progress !== null ? `${job.progress}%` : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Delay</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {job.delay ? `${Math.floor(job.delay / 1000)}s` : 'None'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Job Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Job ID</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-sm text-gray-900 truncate">{job.id}</p>
                                    <button
                                        onClick={() => handleCopyToClipboard(job.id)}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Job Name</p>
                                <p className="text-sm text-gray-900">{job.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Created</p>
                                <p className="text-sm text-gray-900">
                                    {new Date(job.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Updated</p>
                                <p className="text-sm text-gray-900">
                                    {new Date(job.updatedAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Processed</p>
                                <p className="text-sm text-gray-900">
                                    {job.processedOn ? new Date(job.processedOn).toLocaleString() : 'Not yet'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-1">Finished</p>
                                <p className="text-sm text-gray-900">
                                    {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'Not yet'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Job Data */}
                    {job.data && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Job Data</h3>
                                <button
                                    onClick={() => handleCopyToClipboard(formatJson(job.data))}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Copy JSON"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {formatJson(job.data)}
                            </pre>
                        </div>
                    )}

                    {/* Result */}
                    {job.returnvalue && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Result</h3>
                                <button
                                    onClick={() => handleCopyToClipboard(formatJson(job.returnvalue))}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Copy JSON"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <pre className="bg-green-900 text-green-100 p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {formatJson(job.returnvalue)}
                            </pre>
                        </div>
                    )}

                    {/* Error Stack */}
                    {job.failedReason && (
                        <div className="bg-white rounded-lg border border-red-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-red-900">Error</h3>
                                <button
                                    onClick={() => handleCopyToClipboard(job.failedReason || '')}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Copy error"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <pre className="bg-red-900 text-red-100 p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {job.failedReason}
                            </pre>
                        </div>
                    )}

                    {/* Stack Trace */}
                    {job.stacktrace && job.stacktrace.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stack Trace</h3>
                            <div className="space-y-2">
                                {job.stacktrace.map((line, idx) => (
                                    <p key={idx} className="font-mono text-xs text-gray-600">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Backoff Type:</span>
                                <span className="font-medium text-gray-900">{job.backoff?.type || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Backoff Delay:</span>
                                <span className="font-medium text-gray-900">
                                    {job.backoff?.delay ? `${job.backoff.delay}ms` : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Remove On Complete:</span>
                                <span className="font-medium text-gray-900">
                                    {job.removeOnComplete !== null ? (job.removeOnComplete ? 'Yes' : 'No') : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Remove On Fail:</span>
                                <span className="font-medium text-gray-900">
                                    {job.removeOnFail !== null ? (job.removeOnFail ? 'Yes' : 'No') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-600">No job data available</p>
                </div>
            )}
        </div>
    )
}
