import React, { useState, useEffect } from 'react'
import { machinesApi, Machine, MachineStatus } from '../api/machines'
import LoadingSpinner from './LoadingSpinner'
import { cn } from '../utils/cn'
import {
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FireIcon,
  BoltIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ControlPanelProps {
  machineId: string
  machine: Machine | null
}

const ControlPanel: React.FC<ControlPanelProps> = ({ machineId, machine }) => {
  const [status, setStatus] = useState<MachineStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const [controlValues, setControlValues] = useState({
    speed: 0,
    temperature: 0,
    pressure: 0,
  })

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [machineId])

  const loadStatus = async () => {
    try {
      const response = await machinesApi.getStatus(machineId)
      if (response.success && response.data && response.data.length > 0) {
        const latestStatus = response.data[0]
        setStatus(latestStatus)
        setControlValues({
          speed: latestStatus.speed || 0,
          temperature: latestStatus.temperature || 0,
          pressure: latestStatus.pressure || 0,
        })
      }
    } catch (error) {
      console.error('Error loading machine status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeCommand = async (command: string, parameters?: Record<string, any>) => {
    try {
      setIsExecutingCommand(true)
      const response = await machinesApi.sendCommand({
        machine_id: machineId,
        command,
        parameters,
      })
      
      if (response.success) {
        toast.success(`Command "${command}" executed successfully`)
        // Refresh status after command
        setTimeout(loadStatus, 1000)
      } else {
        toast.error(`Command failed: ${response.error}`)
      }
    } catch (error: any) {
      console.error('Error executing command:', error)
      toast.error(`Command failed: ${error.message}`)
    } finally {
      setIsExecutingCommand(false)
    }
  }

  const handleStart = () => executeCommand('start')
  const handleStop = () => executeCommand('stop')
  const handleEmergencyStop = () => {
    if (window.confirm('Are you sure you want to perform an emergency stop? This will immediately halt all operations.')) {
      executeCommand('emergency_stop')
    }
  }

  const handleSetSpeed = () => {
    const speed = parseFloat(prompt('Enter new speed (0-100):') || '0')
    if (speed >= 0 && speed <= 100) {
      executeCommand('set_speed', { speed })
    } else {
      toast.error('Speed must be between 0 and 100')
    }
  }

  const handleSetTemperature = () => {
    const temperature = parseFloat(prompt('Enter target temperature (°C):') || '0')
    if (temperature >= 0 && temperature <= 200) {
      executeCommand('set_temperature', { temperature })
    } else {
      toast.error('Temperature must be between 0 and 200°C')
    }
  }

  const handleSetPressure = () => {
    const pressure = parseFloat(prompt('Enter target pressure (bar):') || '0')
    if (pressure >= 0 && pressure <= 50) {
      executeCommand('set_pressure', { pressure })
    } else {
      toast.error('Pressure must be between 0 and 50 bar')
    }
  }

  const getStatusColor = (value: number, min: number, max: number, optimal: number) => {
    const deviation = Math.abs(value - optimal) / optimal
    if (deviation < 0.1) return 'text-green-600'
    if (deviation < 0.2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading machine status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Live Status</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadStatus}
              disabled={isLoading}
              className="btn btn-outline btn-sm"
            >
              <ArrowPathIcon className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
            {status && (
              <span className="text-sm text-gray-500">
                Last updated: {formatTimestamp(status.timestamp)}
              </span>
            )}
          </div>
        </div>

        {status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Temperature */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FireIcon className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">Temperature</span>
                </div>
              </div>
              <div className={cn(
                'metric-value',
                getStatusColor(status.temperature, 0, 100, 75)
              )}>
                {status.temperature.toFixed(1)}°C
              </div>
            </div>

            {/* Pressure */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CogIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Pressure</span>
                </div>
              </div>
              <div className={cn(
                'metric-value',
                getStatusColor(status.pressure, 0, 50, 25)
              )}>
                {status.pressure.toFixed(1)} bar
              </div>
            </div>

            {/* Speed */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BoltIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Speed</span>
                </div>
              </div>
              <div className={cn(
                'metric-value',
                getStatusColor(status.speed, 0, 100, 80)
              )}>
                {status.speed.toFixed(1)} RPM
              </div>
            </div>

            {/* Vibration */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Vibration</span>
                </div>
              </div>
              <div className={cn(
                'metric-value',
                status.vibration > 5 ? 'text-red-600' :
                status.vibration > 3 ? 'text-yellow-600' : 'text-green-600'
              )}>
                {status.vibration.toFixed(2)} mm/s
              </div>
            </div>

            {/* Power Consumption */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BoltIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Power</span>
                </div>
              </div>
              <div className="metric-value">
                {status.power_consumption.toFixed(1)} kW
              </div>
            </div>

            {/* Efficiency */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CogIcon className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700">Efficiency</span>
                </div>
              </div>
              <div className={cn(
                'metric-value',
                status.efficiency >= 90 ? 'text-green-600' :
                status.efficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {status.efficiency.toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No status data available</h3>
            <p className="mt-1 text-sm text-gray-500">Unable to retrieve current machine status.</p>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Machine Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={isExecutingCommand || machine?.status === 'operational'}
            className={cn(
              'btn btn-success flex items-center justify-center space-x-2 h-12',
              (isExecutingCommand || machine?.status === 'operational') && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isExecutingCommand ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
            <span>Start</span>
          </button>

          {/* Stop button */}
          <button
            onClick={handleStop}
            disabled={isExecutingCommand || machine?.status === 'offline'}
            className={cn(
              'btn btn-secondary flex items-center justify-center space-x-2 h-12',
              (isExecutingCommand || machine?.status === 'offline') && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isExecutingCommand ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <StopIcon className="w-5 h-5" />
            )}
            <span>Stop</span>
          </button>

          {/* Emergency stop button */}
          <button
            onClick={handleEmergencyStop}
            disabled={isExecutingCommand}
            className={cn(
              'btn btn-danger flex items-center justify-center space-x-2 h-12',
              isExecutingCommand && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isExecutingCommand ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {/* Parameter controls */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Parameter Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Speed control */}
          <div className="space-y-2">
            <label className="label">Speed Control</label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 w-16">
                {controlValues.speed.toFixed(0)} RPM
              </span>
              <button
                onClick={handleSetSpeed}
                disabled={isExecutingCommand}
                className="btn btn-outline btn-sm flex-1"
              >
                Set Speed
              </button>
            </div>
          </div>

          {/* Temperature control */}
          <div className="space-y-2">
            <label className="label">Temperature Control</label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 w-16">
                {controlValues.temperature.toFixed(1)}°C
              </span>
              <button
                onClick={handleSetTemperature}
                disabled={isExecutingCommand}
                className="btn btn-outline btn-sm flex-1"
              >
                Set Temp
              </button>
            </div>
          </div>

          {/* Pressure control */}
          <div className="space-y-2">
            <label className="label">Pressure Control</label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 w-16">
                {controlValues.pressure.toFixed(1)} bar
              </span>
              <button
                onClick={handleSetPressure}
                disabled={isExecutingCommand}
                className="btn btn-outline btn-sm flex-1"
              >
                Set Pressure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel