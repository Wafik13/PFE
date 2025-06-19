import React, { useState, useEffect } from 'react'
import { alertsApi, MLAlert } from '../api/alerts'
import LoadingSpinner from './LoadingSpinner'
import { cn } from '../utils/cn'
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon,
  ChartBarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import toast from 'react-hot-toast'

interface PredictionsPanelProps {
  machineId: string
}

const PredictionsPanel: React.FC<PredictionsPanelProps> = ({ machineId }) => {
  const [mlAlerts, setMlAlerts] = useState<MLAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  useEffect(() => {
    loadMLAlerts()
    const interval = setInterval(loadMLAlerts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [machineId, selectedTimeRange])

  const loadMLAlerts = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true)
      
      const response = await alertsApi.getMLAlerts({
        machine_id: machineId,
        time_range: selectedTimeRange,
      })
      
      if (response.success && response.data) {
        setMlAlerts(response.data)
      }
    } catch (error) {
      console.error('Error loading ML alerts:', error)
      toast.error('Failed to load ML predictions')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTimeToFailure = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`
    } else if (hours < 24 * 7) {
      return `${Math.round(hours / 24)}d`
    } else {
      return `${Math.round(hours / (24 * 7))}w`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Generate dummy degradation data for charts
  const generateDegradationData = () => {
    const data = []
    const now = new Date()
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        health: Math.max(20, 100 - (30 - i) * 2.5 + Math.random() * 10 - 5),
        vibration: 2 + (30 - i) * 0.1 + Math.random() * 0.5,
        temperature: 70 + (30 - i) * 0.5 + Math.random() * 3,
      })
    }
    return data
  }

  // Generate fault type distribution data
  const generateFaultTypeData = () => {
    const faultTypes = [
      { name: 'Bearing Wear', value: 35, color: '#ef4444' },
      { name: 'Sensor Drift', value: 25, color: '#f59e0b' },
      { name: 'Valve Issues', value: 20, color: '#3b82f6' },
      { name: 'Motor Problems', value: 15, color: '#8b5cf6' },
      { name: 'Other', value: 5, color: '#6b7280' },
    ]
    return faultTypes
  }

  // Generate MTBF data
  const generateMTBFData = () => {
    return [
      { component: 'Bearing A', mtbf: 2400, current: 1800, status: 'warning' },
      { component: 'Bearing B', mtbf: 2400, current: 600, status: 'critical' },
      { component: 'Motor', mtbf: 8760, current: 7200, status: 'good' },
      { component: 'Pump', mtbf: 4380, current: 3500, status: 'good' },
      { component: 'Valve 1', mtbf: 1460, current: 1200, status: 'warning' },
      { component: 'Sensor Pack', mtbf: 2920, current: 2800, status: 'critical' },
    ]
  }

  const degradationData = generateDegradationData()
  const faultTypeData = generateFaultTypeData()
  const mtbfData = generateMTBFData()

  const predictiveMaintenanceAlerts = mlAlerts.filter(alert => 
    alert.alert_type === 'predictive_maintenance'
  )
  const anomalyDetectionAlerts = mlAlerts.filter(alert => 
    alert.alert_type === 'anomaly_detection'
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading ML predictions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">ML Predictions & Analytics</h2>
          <p className="text-sm text-gray-600">Predictive maintenance and anomaly detection insights</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="input input-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={() => loadMLAlerts(true)}
            disabled={isRefreshing}
            className="btn btn-outline btn-sm"
          >
            <ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Predictive Alerts</p>
              <p className="text-2xl font-bold text-blue-600">{predictiveMaintenanceAlerts.length}</p>
            </div>
            <WrenchScrewdriverIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Anomalies</p>
              <p className="text-2xl font-bold text-orange-600">{anomalyDetectionAlerts.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-green-600">
                {mlAlerts.length > 0 
                  ? `${Math.round(mlAlerts.reduce((sum, alert) => sum + alert.confidence, 0) / mlAlerts.length * 100)}%`
                  : '0%'
                }
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Health Score</p>
              <p className="text-2xl font-bold text-purple-600">78%</p>
            </div>
            <CogIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health degradation trend */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Health Degradation Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={degradationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Health Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fault type distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Predicted Fault Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={faultTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {faultTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MTBF Analysis */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Component MTBF Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MTBF (hours)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Runtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Life
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mtbfData.map((component, index) => {
                const remainingLife = ((component.mtbf - component.current) / component.mtbf) * 100
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {component.component}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.mtbf.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.current.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={cn(
                              'h-2 rounded-full',
                              remainingLife > 50 ? 'bg-green-500' :
                              remainingLife > 25 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.max(0, remainingLife)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {Math.round(remainingLife)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        component.status === 'good' ? 'bg-green-100 text-green-800' :
                        component.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {component.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Alerts */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            ML Predictions ({mlAlerts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {mlAlerts.length > 0 ? (
            mlAlerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {alert.alert_type === 'predictive_maintenance' ? (
                        <WrenchScrewdriverIcon className="w-5 h-5 text-blue-500" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {alert.prediction_type.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getSeverityColor(alert.severity)
                        )}>
                          {alert.severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {alert.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <span className={cn(
                            'ml-1 font-medium',
                            getConfidenceColor(alert.confidence)
                          )}>
                            {Math.round(alert.confidence * 100)}%
                          </span>
                        </div>
                        
                        {alert.time_to_failure && (
                          <div>
                            <span className="text-gray-500">Time to Failure:</span>
                            <span className="ml-1 font-medium text-red-600">
                              {formatTimeToFailure(alert.time_to_failure)}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-gray-500">Predicted:</span>
                          <span className="ml-1 text-gray-900">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {alert.recommendations && alert.recommendations.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Recommendations:</h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {alert.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-gray-400 mr-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No ML predictions available
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                ML models are analyzing machine data. Predictions will appear here when available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PredictionsPanel