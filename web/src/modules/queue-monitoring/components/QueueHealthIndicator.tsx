import React from 'react'
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import type { QueueStats } from '../types/queue.types'

interface QueueHealthIndicatorProps {
    health: QueueStats['health']
    size?: 'sm' | 'md' | 'lg'
}

export const QueueHealthIndicator: React.FC<QueueHealthIndicatorProps> = ({
    health,
    size = 'md',
}) => {
    const sizeMap = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    }

    const colorMap = {
        healthy: 'text-green-500',
        degraded: 'text-yellow-500',
        critical: 'text-red-500',
    }

    const bgColorMap = {
        healthy: 'bg-green-50',
        degraded: 'bg-yellow-50',
        critical: 'bg-red-50',
    }

    const textColorMap = {
        healthy: 'text-green-700',
        degraded: 'text-yellow-700',
        critical: 'text-red-700',
    }

    const labelMap = {
        healthy: 'Healthy',
        degraded: 'Degraded',
        critical: 'Critical',
    }

    const IconComponent = {
        healthy: CheckCircle,
        degraded: AlertTriangle,
        critical: AlertCircle,
    }[health]

    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bgColorMap[health]}`}>
            <IconComponent className={`${sizeMap[size]} ${colorMap[health]}`} />
            <span className={`text-xs font-semibold ${textColorMap[health]}`}>
                {labelMap[health]}
            </span>
        </div>
    )
}
