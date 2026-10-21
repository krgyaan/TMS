import React from 'react'
import { MoreVertical, TrendingUp } from 'lucide-react'
import type { QueueStats } from '../types/queue.types'
import { QueueHealthIndicator } from './QueueHealthIndicator'

interface QueueCardProps {
    queue: QueueStats
    onViewDetails?: () => void
    onPauseResume?: () => void
}

export const QueueCard: React.FC<QueueCardProps> = ({
    queue,
    onViewDetails,
    onPauseResume,
}) => {
    const totalJobs = queue.counts.waiting + queue.counts.active + queue.counts.completed + queue.counts.failed + queue.counts.delayed

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {queue.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{queue.name}</p>
                </div>
                <div className="flex gap-2">
                    <QueueHealthIndicator health={queue.health} size="sm" />
                    {queue.isPaused && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            Paused
                        </span>
                    )}
                </div>
            </div>

            {/* Job Status Bar */}
            <div className="mb-4">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
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
                                className="bg-green-500"
                                style={{
                                    width: `${(queue.counts.active / totalJobs) * 100}%`,
                                }}
                                title={`Active: ${queue.counts.active}`}
                            />
                            <div
                                className="bg-gray-400"
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
                        <div className="w-full bg-gray-300" />
                    )}
                </div>
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                        {queue.counts.waiting}
                    </p>
                    <p className="text-xs text-gray-600">Waiting</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {queue.counts.active}
                    </p>
                    <p className="text-xs text-gray-600">Active</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">
                        {queue.counts.completed}
                    </p>
                    <p className="text-xs text-gray-600">Done</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                        {queue.counts.failed}
                    </p>
                    <p className="text-xs text-gray-600">Failed</p>
                </div>
            </div>

            {/* Rates */}
            <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                        Completion: <span className="font-semibold">{queue.rates.completionRate.toFixed(1)}%</span>
                    </span>
                    <span className="text-gray-600">
                        Avg: <span className="font-semibold">{(queue.rates.averageProcessingTime / 1000).toFixed(1)}s</span>
                    </span>
                </div>
            </div>

            {/* Last Activity */}
            <div className="text-xs text-gray-500 mb-4">
                Last activity: {queue.lastActivity.toLocaleTimeString()}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onViewDetails}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                >
                    View Details
                </button>
                <button
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="More options"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
