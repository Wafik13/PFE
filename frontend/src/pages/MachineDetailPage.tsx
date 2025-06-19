import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { machinesApi, Machine } from '../api/machines'
import LoadingSpinner from '../components/LoadingSpinner'
import TabLayout from '../components/TabLayout'
import ControlPanel from '../components/ControlPanel'
import AlertsPanel from '../components/AlertsPanel'
import PredictionsPanel from '../components/PredictionsPanel'
import AnalyticsPanel from '../components/AnalyticsPanel'
import { cn } from '../utils/cn'
import {
  ArrowLeftIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const MachineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [machine, setMachine] = useState<Machine | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('control')

  useEffect(() => {
    if (id) {
      loadMachine(id)
    }
  }, [id])

  const loadMachine = async (machineId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await machinesApi.getById(machineId)
      if (response.success && response.data) {
        setMachine(response.data)
      } else {
        setError(response.error || 'Machine not found')
      }
    } catch (error: any) {
      console.error('Error loading machine:', error)
      setError('Failed to load machine details. Please try again.')
      toast.error('Failed to load machine details')
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
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
      case 'offline':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />
      case 'maintenance':
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const tabs = [
    {
      id: 'control',
      name: 'Control',
      component: <ControlPanel machineId={id!} machine={machine} />,
    },
    {
      id: 'alerts',
      name: 'Alerts',
      component: <AlertsPanel machineId={id!} />,
    },
    {
      id: 'predictions',
      name: 'ML Predictions',
      component: <PredictionsPanel machineId={id!} />,
    },
    {
      id: 'analytics',
      name: 'Analytics',
      component: <AnalyticsPanel machineId={id!} />,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading machine details...</p>
        </div>
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading machine</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6 space-x-3">
          <button
            onClick={() => navigate('/machines')}
            className="btn btn-outline"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Machines
          </button>
          <button
            onClick={() => id && loadMachine(id)}
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
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/machines')}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-primary-600" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{machine.name}</h1>
                <div className={cn(
                  'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
                  getStatusColor(machine.status)
                )}>
                  {getStatusIcon(machine.status)}
                  <span className="capitalize">{machine.status}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>{machine.type}</span>
                <span>•</span>
                <span>{machine.location}</span>
                <span>•</span>
                <span>ID: {machine.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="metric-value">{machine.health_score}%</div>
          <div className="metric-label">Health Score</div>
          <div className="mt-2">
            <div className="progress-bar">
              <div 
                className={cn(
                  'progress-fill',
                  machine.health_score >= 80 ? 'bg-green-500' :
                  machine.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${machine.health_score}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{machine.uptime_percentage.toFixed(1)}%</div>
          <div className="metric-label">Uptime</div>
          <div className="mt-2">
            <div className="progress-bar">
              <div 
                className="progress-fill bg-blue-500"
                style={{ width: `${machine.uptime_percentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value text-sm">{formatDate(machine.last_maintenance)}</div>
          <div className="metric-label">Last Maintenance</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value text-sm">{formatDate(machine.next_maintenance)}</div>
          <div className="metric-label">Next Maintenance</div>
        </div>
      </div>

      {/* Machine description */}
      {machine.description && (
        <div className="card p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600">{machine.description}</p>
        </div>
      )}

      {/* Tabbed content */}
      <TabLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}

export default MachineDetailPage