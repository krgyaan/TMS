import React from 'react'
import { Button } from '@/components/ui/button'
import type { QueueStats } from '../types/queue.types'
import { QueueHealthIndicator } from './QueueHealthIndicator'

interface QueueCardProps {
    queue: QueueStats
    onViewDetails?: () => void
}

export const QueueCard: React.FC<QueueCardProps> = ({
    queue,
    onViewDetails,
}) => {
    const totalJobs = queue.counts.waiting + queue.counts.active + queue.counts.completed + queue.counts.failed + queue.counts.delayed

    return (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {queue.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{queue.name}</p>
                </div>
                <div className="flex gap-2">
                    <QueueHealthIndicator health={queue.health} size="sm" />
                    {queue.isPaused && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                            Paused
                        </span>
                    )}
                </div>
            </div>

            {/* Job Status Bar */}
            <div className="mb-4">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                    {totalJobs > 0 ? (
                        <>
                            <div
                                className="bg-blue-500"
                                style={{
                                    width: `${(queue.counts.waiting / totalJobs) * 100}%`,
                                }}
                                title={`Waiting: ${queue.counts.waiting}`}
                            />
                            <div
                                className="bg-emerald-500"
                                style={{
                                    width: `${(queue.counts.active / totalJobs) * 100}%`,
                                }}
                                title={`Active: ${queue.counts.active}`}
                            />
                            <div
                                className="bg-muted-foreground/40"
                                style={{
                                    width: `${(queue.counts.completed / totalJobs) * 100}%`,
                                }}
                                title={`Completed: ${queue.counts.completed}`}
                            />
                            <div
                                className="bg-red-500"
                                style={{
                                    width: `${(queue.counts.failed / totalJobs) * 100}%`,
                                }}
                                title={`Failed: ${queue.counts.failed}`}
                            />
                        </>
                    ) : (
                        <div className="w-full bg-muted-foreground/30" />
                    )}
                </div>
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {queue.counts.waiting}
                    </p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {queue.counts.active}
                    </p>
                    <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                        {queue.counts.completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {queue.counts.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                </div>
            </div>

            {/* Rates */}
            <div className="mb-4 pb-4 border-b border-border">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                        Completion: <span className="font-semibold text-foreground">{queue.rates.completionRate.toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground">
                        Avg: <span className="font-semibold text-foreground">{(queue.rates.averageProcessingTime / 1000).toFixed(1)}s</span>
                    </span>
                </div>
            </div>

            {/* Last Activity */}
            <div className="text-xs text-muted-foreground mb-4">
                Last activity: {new Date(queue.lastActivity).toLocaleTimeString()}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewDetails}
                    className="flex-1"
                >
                    View Details
                </Button>
            </div>
        </div>
    )
}
