import React, { useState, useEffect } from 'react'
import { machinesApi, ProcessData } from '../api/machines'
import { alertsApi, MLAlert } from '../api/alerts'
import LoadingSpinner from './LoadingSpinner'
import { cn } from '../utils/cn'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface AnalyticsPanelProps {
  machineId: string
}

interface PerformanceMetrics {
  efficiency: number
  uptime: number
  throughput: number
  qualityScore: number
  energyConsumption: number
  maintenanceCost: number
}

interface TrendData {
  parameter: string
  current: number
  previous: number
  trend: 'up' | 'down' | 'stable'
  change: number
  unit: string
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ machineId }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [predictions, setPredictions] = useState<MLAlert[]>([])
  const [processData, setProcessData] = useState<ProcessData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    loadAnalyticsData()
  }, [machineId, timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load performance metrics
      const metricsResponse = await machinesApi.getPerformanceMetrics(machineId, timeRange)
      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data)
      }

      // Load trend data
      const trendsResponse = await machinesApi.getTrendAnalysis(machineId, timeRange)
      if (trendsResponse.success && trendsResponse.data) {
        setTrends(trendsResponse.data)
      }

      // Load ML predictions
      const predictionsResponse = await alertsApi.getMLAlerts({
        machine_id: machineId,
        alert_type: ['prediction'],
        limit: 10
      })
      if (predictionsResponse.success && predictionsResponse.data) {
        setPredictions(predictionsResponse.data.data || [])
      }

      // Load recent process data
      const processResponse = await machinesApi.getProcessData(machineId, {
        limit: 100,
        start_time: new Date(Date.now() - getTimeRangeMs(timeRange)).toISOString()
      })
      if (processResponse.success && processResponse.data) {
        setProcessData(processResponse.data.data || [])
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err)
      setError('Failed to load analytics data')
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000
      case '24h': return 24 * 60 * 60 * 1000
      case '7d': return 7 * 24 * 60 * 60 * 1000
      case '30d': return 30 * 24 * 60 * 60 * 1000
      default: return 24 * 60 * 60 * 1000
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const formatChange = (change: number, unit: string) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}${unit}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadAnalyticsData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Analytics & Performance</h3>
        <div className="flex space-x-2">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1 text-sm rounded-lg transition-colors',
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.efficiency.toFixed(1)}%</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.uptime.toFixed(1)}%</p>
              </div>
              <ClockIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.qualityScore.toFixed(1)}</p>
              </div>
              <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">Q</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      {trends.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h4>
          <div className="space-y-3">
            {trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  {getTrendIcon(trend.trend)}
                  <span className="font-medium text-gray-900">{trend.parameter}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {trend.current.toFixed(1)} {trend.unit}
                  </div>
                  <div className={cn(
                    'text-sm',
                    trend.trend === 'up' ? 'text-green-600' : trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {formatChange(trend.change, trend.unit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ML Predictions */}
      {predictions.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Predictive Insights</h4>
          <div className="space-y-3">
            {predictions.slice(0, 5).map((prediction) => (
              <div key={prediction.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <ExclamationTriangleIcon className={cn(
                  'h-5 w-5 mt-0.5',
                  prediction.severity === 'critical' ? 'text-red-500' :
                  prediction.severity === 'high' ? 'text-orange-500' :
                  prediction.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                )} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{prediction.fault_type}</p>
                  <p className="text-sm text-gray-600">{prediction.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Confidence: {(prediction.confidence * 100).toFixed(1)}%</span>
                    {prediction.time_to_failure && (
                      <span>Time to failure: {prediction.time_to_failure}h</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process Data Summary */}
      {processData.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Process Data</h4>
          <div className="text-sm text-gray-600">
            <p>Showing {processData.length} data points from the last {timeRange}</p>
            <p className="mt-2">
              Parameters monitored: {[...new Set(processData.map(d => d.parameter))].join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPanel