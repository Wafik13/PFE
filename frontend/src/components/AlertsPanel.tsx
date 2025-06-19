import React, { useState, useEffect } from 'react'
import { alertsApi, Alarm } from '../api/alerts'
import LoadingSpinner from './LoadingSpinner'
import { cn } from '../utils/cn'
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface AlertsPanelProps {
  machineId: string
}

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info'
type StatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved'

const AlertsPanel: React.FC<AlertsPanelProps> = ({ machineId }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadAlarms()
    const interval = setInterval(loadAlarms, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [machineId, severityFilter, statusFilter])

  const loadAlarms = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true)
      
      const filters: any = {
        machine_id: machineId,
      }
      
      if (severityFilter !== 'all') {
        filters.severity = severityFilter
      }
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }

      const response = await alertsApi.getAlarms(filters)
      if (response.success && response.data) {
        setAlarms(response.data)
      }
    } catch (error) {
      console.error('Error loading alarms:', error)
      toast.error('Failed to load alarms')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleAcknowledge = async (alarmId: string) => {
    try {
      setIsProcessing(alarmId)
      const response = await alertsApi.acknowledgeAlarm(alarmId, {
        acknowledged_by: 'current_user', // In real app, get from auth context
        notes: 'Acknowledged from control panel',
      })
      
      if (response.success) {
        toast.success('Alarm acknowledged')
        loadAlarms()
      }
    } catch (error: any) {
      console.error('Error acknowledging alarm:', error)
      toast.error(`Failed to acknowledge alarm: ${error.message}`)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleResolve = async (alarmId: string) => {
    try {
      setIsProcessing(alarmId)
      const response = await alertsApi.resolveAlarm(alarmId, {
        resolved_by: 'current_user', // In real app, get from auth context
        resolution_notes: 'Resolved from control panel',
      })
      
      if (response.success) {
        toast.success('Alarm resolved')
        loadAlarms()
      }
    } catch (error: any) {
      console.error('Error resolving alarm:', error)
      toast.error(`Failed to resolve alarm: ${error.message}`)
    } finally {
      setIsProcessing(null)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800'
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredAlarms = alarms.filter(alarm => {
    if (severityFilter !== 'all' && alarm.severity !== severityFilter) return false
    if (statusFilter !== 'all' && alarm.status !== statusFilter) return false
    return true
  })

  const activeCriticalCount = alarms.filter(a => a.status === 'active' && a.severity === 'critical').length
  const activeWarningCount = alarms.filter(a => a.status === 'active' && a.severity === 'warning').length
  const acknowledgedCount = alarms.filter(a => a.status === 'acknowledged').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Active</p>
              <p className="text-2xl font-bold text-red-600">{activeCriticalCount}</p>
            </div>
            <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warning Active</p>
              <p className="text-2xl font-bold text-yellow-600">{activeWarningCount}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-yellow-600">{acknowledgedCount}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alarms.length}</p>
            </div>
            <InformationCircleIcon className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters and controls */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="input input-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input input-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          
          <button
            onClick={() => loadAlarms(true)}
            disabled={isRefreshing}
            className="btn btn-outline btn-sm"
          >
            <ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts list */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Alerts ({filteredAlarms.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredAlarms.length > 0 ? (
            filteredAlarms.map((alarm) => (
              <div key={alarm.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getSeverityIcon(alarm.severity)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {alarm.alarm_type.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getSeverityColor(alarm.severity)
                        )}>
                          {alarm.severity}
                        </span>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(alarm.status)
                        )}>
                          {alarm.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {alarm.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Triggered: {formatTimestamp(alarm.timestamp)}</span>
                        {alarm.acknowledged_at && (
                          <span>Acknowledged: {formatTimestamp(alarm.acknowledged_at)}</span>
                        )}
                        {alarm.resolved_at && (
                          <span>Resolved: {formatTimestamp(alarm.resolved_at)}</span>
                        )}
                      </div>
                      
                      {alarm.parameters && Object.keys(alarm.parameters).length > 0 && (
                        <div className="mt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                              View parameters
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(alarm.parameters, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {alarm.status === 'active' && (
                      <button
                        onClick={() => handleAcknowledge(alarm.id)}
                        disabled={isProcessing === alarm.id}
                        className="btn btn-outline btn-sm"
                      >
                        {isProcessing === alarm.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          'Acknowledge'
                        )}
                      </button>
                    )}
                    
                    {(alarm.status === 'active' || alarm.status === 'acknowledged') && (
                      <button
                        onClick={() => handleResolve(alarm.id)}
                        disabled={isProcessing === alarm.id}
                        className="btn btn-success btn-sm"
                      >
                        {isProcessing === alarm.id ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>Resolve</>
                        )}
                      </button>
                    )}
                    
                    {alarm.status === 'resolved' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No alerts found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {severityFilter !== 'all' || statusFilter !== 'all'
                  ? 'No alerts match the current filters.'
                  : 'This machine has no alerts at the moment.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertsPanel