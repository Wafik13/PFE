import { apiMethods, ApiResponse } from './index'

export interface Machine {
  id: string
  name: string
  type: string
  location: string
  status: 'operational' | 'warning' | 'offline' | 'maintenance'
  health_score: number
  uptime_percentage: number
  last_maintenance: string
  next_maintenance: string
  description?: string
  specifications?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MachineStatus {
  machine_id: string
  status: 'operational' | 'warning' | 'offline' | 'maintenance'
  temperature: number
  pressure: number
  vibration: number
  speed: number
  power_consumption: number
  efficiency: number
  timestamp: string
}

export interface ProcessData {
  machine_id: string
  parameter: string
  value: number
  unit: string
  timestamp: string
  quality_score?: number
}

export interface ControlCommand {
  machine_id: string
  command: string
  parameters?: Record<string, any>
  timestamp?: string
}

export interface ControlResponse {
  success: boolean
  message: string
  command_id?: string
}

export const machinesApi = {
  /**
   * Get all machines
   */
  getAll: async (): Promise<ApiResponse<Machine[]>> => {
    return apiMethods.get<Machine[]>('/machines')
  },

  /**
   * Get machine by ID
   */
  getById: async (id: string): Promise<ApiResponse<Machine>> => {
    return apiMethods.get<Machine>(`/machines/${id}`)
  },

  /**
   * Get machine status
   */
  getStatus: async (machineId?: string): Promise<ApiResponse<MachineStatus[]>> => {
    const url = machineId ? `/status?machine_id=${machineId}` : '/status'
    return apiMethods.get<MachineStatus[]>(url)
  },

  /**
   * Get process data for a machine
   */
  getProcessData: async (
    machineId?: string,
    options?: {
      startTime?: string
      endTime?: string
      limit?: number
      start_time?: string
      end_time?: string
    }
  ): Promise<ApiResponse<{ data: ProcessData[] }>> => {
    const params = new URLSearchParams()
    if (machineId) params.append('machine_id', machineId)
    if (options?.startTime || options?.start_time) {
      params.append('start_time', options.startTime || options.start_time!)
    }
    if (options?.endTime || options?.end_time) {
      params.append('end_time', options.endTime || options.end_time!)
    }
    if (options?.limit) params.append('limit', options.limit.toString())
    
    const url = `/process-data${params.toString() ? `?${params.toString()}` : ''}`
    return apiMethods.get<{ data: ProcessData[] }>(url)
  },

  /**
   * Send control command to machine
   */
  sendCommand: async (command: ControlCommand): Promise<ApiResponse<ControlResponse>> => {
    return apiMethods.post<ControlResponse>('/control', command)
  },

  /**
   * Start machine
   */
  start: async (machineId: string): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'start',
    })
  },

  /**
   * Stop machine
   */
  stop: async (machineId: string): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'stop',
    })
  },

  /**
   * Emergency stop machine
   */
  emergencyStop: async (machineId: string): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'emergency_stop',
    })
  },

  /**
   * Set machine speed
   */
  setSpeed: async (machineId: string, speed: number): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'set_speed',
      parameters: { speed },
    })
  },

  /**
   * Set machine temperature
   */
  setTemperature: async (machineId: string, temperature: number): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'set_temperature',
      parameters: { temperature },
    })
  },

  /**
   * Set machine pressure
   */
  setPressure: async (machineId: string, pressure: number): Promise<ApiResponse<ControlResponse>> => {
    return machinesApi.sendCommand({
      machine_id: machineId,
      command: 'set_pressure',
      parameters: { pressure },
    })
  },

  /**
   * Get machine maintenance history
   */
  getMaintenanceHistory: async (machineId: string): Promise<ApiResponse<any[]>> => {
    return apiMethods.get<any[]>(`/machines/${machineId}/maintenance`)
  },

  /**
   * Schedule maintenance for machine
   */
  scheduleMaintenance: async (
    machineId: string,
    scheduledDate: string,
    type: string,
    description?: string
  ): Promise<ApiResponse<any>> => {
    return apiMethods.post<any>(`/machines/${machineId}/maintenance`, {
      scheduled_date: scheduledDate,
      type,
      description,
    })
  },

  /**
   * Get performance metrics for a machine
   */
  getPerformanceMetrics: async (
    machineId: string,
    timeRange: string
  ): Promise<ApiResponse<{
    efficiency: number
    uptime: number
    throughput: number
    qualityScore: number
    energyConsumption: number
    maintenanceCost: number
  }>> => {
    return apiMethods.get<any>(`/machines/${machineId}/metrics?time_range=${timeRange}`)
  },

  /**
   * Get trend analysis for a machine
   */
  getTrendAnalysis: async (
    machineId: string,
    timeRange: string
  ): Promise<ApiResponse<{
    parameter: string
    current: number
    previous: number
    trend: 'up' | 'down' | 'stable'
    change: number
    unit: string
  }[]>> => {
    return apiMethods.get<any>(`/machines/${machineId}/trends?time_range=${timeRange}`)
  },
}