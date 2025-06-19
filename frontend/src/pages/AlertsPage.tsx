import React, { useState, useEffect } from 'react'
import { alertsApi, Alarm, MLAlert } from '../api/alerts'
import { machinesApi, Machine } from '../api/machines'
import LoadingSpinner from '../components/LoadingSpinner'
import { cn } from '../utils/cn'
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

type AlertType = 'all' | 'alarms' | 'ml_alerts'
type SeverityFilter = 'all' | 'critical' | 'warning' | 'info'
type StatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved'

const AlertsPage: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [mlAlerts, setMlAlerts] = useState<MLAlert[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertType>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedMachine, setSelectedMachine] = useState<string>('all')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true)
      
      const [alarmsResponse, mlAlertsResponse, machinesResponse] = await Promise.all([
        alertsApi.getAlarms(),
        alertsApi.getMLAlerts(),
        machinesApi.getAllMachines(),
      ])
      
      if (alarmsResponse.success && alarmsResponse.data) {
        setAlarms(alarmsResponse.data)
      }
      
      if (mlAlertsResponse.success && mlAlertsResponse.data) {
        setMlAlerts(mlAlertsResponse.data)
      }
      
      if (machinesResponse.success && machinesResponse.data) {
        setMachines(machinesResponse.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load alerts data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleAcknowledge = async (alarmId: string) => {
    try {
      setIsProcessing(alarmId)
      const response = await alertsApi.acknowledgeAlarm(alarmId, {
        acknowledged_by: 'current_user',
        notes: 'Acknowledged from alerts page',
      })
      
      if (response.success) {
        toast.success('Alarm acknowledged')
        loadData()
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
        resolved_by: 'current_user',
        resolution_notes: 'Resolved from alerts page',
      })
      
      if (response.success) {
        toast.success('Alarm resolved')
        loadData()
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

  const getMachineName = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId)
    return machine ? machine.name : machineId
  }

  // Combine and filter alerts
  const combinedAlerts = [
    ...alarms.map(alarm => ({ ...alarm, type: 'alarm' as const })),
    ...mlAlerts.map(alert => ({ ...alert, type: 'ml_alert' as const })),
  ]

  const filteredAlerts = combinedAlerts.filter(alert => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        (alert.type === 'alarm' && alert.alarm_type.toLowerCase().includes(searchLower)) ||
        (alert.type === 'ml_alert' && alert.prediction_type.toLowerCase().includes(searchLower)) ||
        alert.description.toLowerCase().includes(searchLower) ||
        getMachineName(alert.machine_id).toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }
    
    // Alert type filter
    if (alertTypeFilter === 'alarms' && alert.type !== 'alarm') return false
    if (alertTypeFilter === 'ml_alerts' && alert.type !== 'ml_alert') return false
    
    // Severity filter
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false
    
    // Status filter (only applies to alarms)
    if (statusFilter !== 'all' && alert.type === 'alarm' && alert.status !== statusFilter) return false
    
    // Machine filter
    if (selectedMachine !== 'all' && alert.machine_id !== selectedMachine) return false
    
    return true
  })

  // Sort by timestamp (newest first)
  filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate statistics
  const stats = {
    total: combinedAlerts.length,
    critical: combinedAlerts.filter(a => a.severity === 'critical').length,
    warning: combinedAlerts.filter(a => a.severity === 'warning').length,
    active: alarms.filter(a => a.status === 'active').length,
    acknowledged: alarms.filter(a => a.status === 'acknowledged').length,
    mlPredictions: mlAlerts.length,
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Predictions</h1>
          <p className="text-gray-600">Monitor all system alerts and ML predictions across machines</p>
        </div>
        
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="btn btn-outline"
        >
          <ArrowPathIcon className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <InformationCircleIcon className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warning</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ML Predictions</p>
              <p className="text-2xl font-bold text-blue-600">{stats.mlPredictions}</p>
            </div>
            <WrenchScrewdriverIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={alertTypeFilter}
              onChange={(e) => setAlertTypeFilter(e.target.value as AlertType)}
              className="input input-sm"
            >
              <option value="all">All Types</option>
              <option value="alarms">Alarms Only</option>
              <option value="ml_alerts">ML Predictions Only</option>
            </select>
            
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
            
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="input input-sm"
            >
              <option value="all">All Machines</option>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Alerts ({filteredAlerts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div key={`${alert.type}-${alert.id}`} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {alert.type === 'ml_alert' ? (
                        <WrenchScrewdriverIcon className="w-5 h-5 text-blue-500" />
                      ) : (
                        getSeverityIcon(alert.severity)
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {alert.type === 'alarm' 
                            ? alert.alarm_type.replace(/_/g, ' ').toUpperCase()
                            : alert.prediction_type.replace(/_/g, ' ').toUpperCase()
                          }
                        </h4>
                        
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          alert.type === 'ml_alert' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        )}>
                          {alert.type === 'ml_alert' ? 'ML Prediction' : 'Alarm'}
                        </span>
                        
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getSeverityColor(alert.severity)
                        )}>
                          {alert.severity}
                        </span>
                        
                        {alert.type === 'alarm' && (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            getStatusColor(alert.status)
                          )}>
                            {alert.status}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {alert.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Machine: {getMachineName(alert.machine_id)}</span>
                        <span>Time: {formatTimestamp(alert.timestamp)}</span>
                        
                        {alert.type === 'ml_alert' && 'confidence' in alert && (
                          <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                        )}
                        
                        {alert.type === 'ml_alert' && 'time_to_failure' in alert && alert.time_to_failure && (
                          <span className="text-red-600">
                            TTF: {alert.time_to_failure < 24 
                              ? `${Math.round(alert.time_to_failure)}h`
                              : `${Math.round(alert.time_to_failure / 24)}d`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {alert.type === 'alarm' && (
                    <div className="flex items-center space-x-2 ml-4">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={isProcessing === alert.id}
                          className="btn btn-outline btn-sm"
                        >
                          {isProcessing === alert.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Acknowledge'
                          )}
                        </button>
                      )}
                      
                      {(alert.status === 'active' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={isProcessing === alert.id}
                          className="btn btn-success btn-sm"
                        >
                          {isProcessing === alert.id ? (
                            <LoadingSpinner size="sm" color="white" />
                          ) : (
                            'Resolve'
                          )}
                        </button>
                      )}
                      
                      {alert.status === 'resolved' && (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  )}
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
                {searchTerm || severityFilter !== 'all' || statusFilter !== 'all' || selectedMachine !== 'all'
                  ? 'No alerts match the current filters.'
                  : 'All systems are running normally.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertsPage