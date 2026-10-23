import { AlertCircle, ArrowLeft, Copy, RefreshCw } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
                <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4">
                    <p className="text-destructive">Queue name and job ID are required</p>
                </div>
            </div>
        )
    }

    const statusColorMap: Record<string, string> = {
        completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        delayed: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
        paused: 'bg-muted text-muted-foreground border border-border',
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/queue-monitoring/queues/${queueName}`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Job Details</h1>
                        <p className="text-muted-foreground mt-1">
                            {queueName} / <span className="font-mono text-sm">{jobId}</span>
                        </p>
                    </div>
                </div>

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

            {/* Error State */}
            {error && (
                <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-destructive">Failed to load job details</h3>
                        <p className="text-sm text-destructive/90 mt-1">
                            {error instanceof Error ? error.message : 'An error occurred'}
                        </p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading job details...</p>
                    </div>
                </div>
            ) : job ? (
                <div className="space-y-6">
                    {/* Status Overview */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        statusColorMap[job.state as keyof typeof statusColorMap] ||
                                        'bg-muted text-muted-foreground border border-border'
                                    }`}
                                >
                                    {job.state}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Attempts</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {job.attemptsMade}/{job.attempts}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {job.progress !== null ? `${job.progress}%` : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Delay</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {job.delay ? `${Math.floor(job.delay / 1000)}s` : 'None'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Job Info */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Job Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Job ID</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-sm text-foreground truncate">{job.id}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground"
                                        onClick={() => handleCopyToClipboard(job.id)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Job Name</p>
                                <p className="text-sm text-foreground">{job.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Created</p>
                                <p className="text-sm text-foreground">
                                    {new Date(job.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Updated</p>
                                <p className="text-sm text-foreground">
                                    {new Date(job.updatedAt).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Processed</p>
                                <p className="text-sm text-foreground">
                                    {job.processedOn ? new Date(job.processedOn).toLocaleString() : 'Not yet'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Finished</p>
                                <p className="text-sm text-foreground">
                                    {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'Not yet'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Job Data */}
                    {job.data && (
                        <div className="bg-card rounded-lg border border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground">Job Data</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground"
                                    title="Copy JSON"
                                    onClick={() => handleCopyToClipboard(formatJson(job.data))}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <pre className="bg-muted text-foreground p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {formatJson(job.data)}
                            </pre>
                        </div>
                    )}

                    {/* Result */}
                    {job.returnvalue && (
                        <div className="bg-card rounded-lg border border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground">Result</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground"
                                    title="Copy JSON"
                                    onClick={() => handleCopyToClipboard(formatJson(job.returnvalue))}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <pre className="bg-emerald-500/10 text-foreground p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {formatJson(job.returnvalue)}
                            </pre>
                        </div>
                    )}

                    {/* Error Stack */}
                    {job.failedReason && (
                        <div className="bg-card rounded-lg border border-destructive/20 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-destructive">Error</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground"
                                    title="Copy error"
                                    onClick={() => handleCopyToClipboard(job.failedReason || '')}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <pre className="bg-red-500/10 text-destructive p-4 rounded overflow-auto max-h-64 text-xs font-mono">
                                {job.failedReason}
                            </pre>
                        </div>
                    )}

                    {/* Stack Trace */}
                    {job.stacktrace && job.stacktrace.length > 0 && (
                        <div className="bg-card rounded-lg border border-border p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Stack Trace</h3>
                            <div className="space-y-2">
                                {job.stacktrace.map((line, idx) => (
                                    <p key={idx} className="font-mono text-xs text-muted-foreground">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Additional Information</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Backoff Type:</span>
                                <span className="font-medium text-foreground">{job.backoff?.type || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Backoff Delay:</span>
                                <span className="font-medium text-foreground">
                                    {job.backoff?.delay ? `${job.backoff.delay}ms` : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Remove On Complete:</span>
                                <span className="font-medium text-foreground">
                                    {job.removeOnComplete !== null ? (job.removeOnComplete ? 'Yes' : 'No') : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Remove On Fail:</span>
                                <span className="font-medium text-foreground">
                                    {job.removeOnFail !== null ? (job.removeOnFail ? 'Yes' : 'No') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No job data available</p>
                </div>
            )}
        </div>
    )
}
