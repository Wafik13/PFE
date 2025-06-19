import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { machinesApi, Machine } from '../api/machines'
import { alertsApi } from '../api/alerts'
import LoadingSpinner from '../components/LoadingSpinner'
import { cn } from '../utils/cn'
import {
  CpuChipIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface MachineWithAlerts extends Machine {
  activeAlarmsCount?: number
  criticalAlarmsCount?: number
}

const MachinesPage: React.FC = () => {
  const [machines, setMachines] = useState<MachineWithAlerts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadMachines()
  }, [])

  const loadMachines = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await machinesApi.getAll()
      if (response.success && response.data) {
        // Load alarm counts for each machine
        const machinesWithAlerts = await Promise.all(
          response.data.map(async (machine) => {
            try {
              const alarmsResponse = await alertsApi.getActiveAlarms(machine.id)
              const criticalAlarmsResponse = await alertsApi.getCriticalAlarms(machine.id)
              
              return {
                ...machine,
                activeAlarmsCount: alarmsResponse.data?.length || 0,
                criticalAlarmsCount: criticalAlarmsResponse.data?.length || 0,
              }
            } catch (error) {
              console.error(`Error loading alarms for machine ${machine.id}:`, error)
              return {
                ...machine,
                activeAlarmsCount: 0,
                criticalAlarmsCount: 0,
              }
            }
          })
        )
        
        setMachines(machinesWithAlerts)
      } else {
        setError(response.error || 'Failed to load machines')
      }
    } catch (error: any) {
      console.error('Error loading machines:', error)
      setError('Failed to load machines. Please try again.')
      toast.error('Failed to load machines')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'offline':
        return 'text-red-600 bg-red-100'
      case 'maintenance':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
      case 'offline':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'maintenance':
        return <WrenchScrewdriverIcon className="w-4 h-4 text-blue-500" />
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />
    }
  }

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading machines...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading machines</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            onClick={loadMachines}
            className="btn btn-primary"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machines</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and control your industrial equipment
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={loadMachines}
            className="btn btn-primary"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>
        
        {/* Status filter */}
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="warning">Warning</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center">
            <CpuChipIcon className="w-8 h-8 text-primary-600" />
            <div className="ml-3">
              <p className="metric-value">{machines.length}</p>
              <p className="metric-label">Total Machines</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="ml-3">
              <p className="metric-value">
                {machines.filter(m => m.status === 'operational').length}
              </p>
              <p className="metric-label">Operational</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="metric-value">
                {machines.filter(m => m.status === 'warning').length}
              </p>
              <p className="metric-label">Warnings</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
            </div>
            <div className="ml-3">
              <p className="metric-value">
                {machines.filter(m => m.status === 'offline').length}
              </p>
              <p className="metric-label">Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Machines grid */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No machines found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No machines are currently configured.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((machine) => (
            <div key={machine.id} className="card-hover p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <CpuChipIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{machine.name}</h3>
                    <p className="text-sm text-gray-500">{machine.type}</p>
                  </div>
                </div>
                
                {/* Status badge */}
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(machine.status)
                )}>
                  {getStatusIcon(machine.status)}
                  <span className="capitalize">{machine.status}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Health Score</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          machine.health_score >= 80 ? 'bg-green-500' :
                          machine.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${machine.health_score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {machine.health_score}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium text-gray-900">
                    {machine.uptime_percentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Location</span>
                  <span className="text-sm font-medium text-gray-900">
                    {machine.location}
                  </span>
                </div>
              </div>

              {/* Alerts */}
              {(machine.activeAlarmsCount! > 0 || machine.criticalAlarmsCount! > 0) && (
                <div className="flex items-center space-x-4 mb-4 p-2 bg-red-50 rounded-md">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                  <div className="text-sm">
                    {machine.criticalAlarmsCount! > 0 && (
                      <span className="text-red-600 font-medium">
                        {machine.criticalAlarmsCount} critical
                      </span>
                    )}
                    {machine.criticalAlarmsCount! > 0 && machine.activeAlarmsCount! > machine.criticalAlarmsCount! && (
                      <span className="text-gray-600">, </span>
                    )}
                    {machine.activeAlarmsCount! > machine.criticalAlarmsCount! && (
                      <span className="text-yellow-600">
                        {machine.activeAlarmsCount! - machine.criticalAlarmsCount!} other alerts
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Maintenance info */}
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                <ClockIcon className="w-4 h-4" />
                <span>Last maintenance: {formatDate(machine.last_maintenance)}</span>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  to={`/machines/${machine.id}`}
                  className="btn btn-primary flex-1 flex items-center justify-center"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MachinesPage