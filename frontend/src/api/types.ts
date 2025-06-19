// Re-export all types from individual API modules for convenience
export type { Machine, MachineStatus, ProcessData, ControlCommand, ControlResponse } from './machines'
export type { Alarm, MLAlert, AlertsFilter, MLAlertsFilter } from './alerts'
export type { User, LoginCredentials, AuthResponse } from './auth'

// Common API response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Pagination interface
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

// WebSocket message types
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

// System metrics interface
export interface SystemMetrics {
  totalMachines: number
  operationalMachines: number
  warningMachines: number
  offlineMachines: number
  totalAlerts: number
  criticalAlerts: number
  averageHealthScore: number
  systemUptime: number
}

// Recent activity interface
export interface RecentActivity {
  id: string
  type: 'alarm' | 'maintenance' | 'status_change'
  message: string
  timestamp: string
  severity?: 'critical' | 'warning' | 'info'
  machineId?: string
  machineName?: string
}

// Chart data interfaces
export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface TimeSeriesData {
  parameter: string
  data: ChartDataPoint[]
  unit?: string
  color?: string
}

// Filter interfaces
export interface DateRange {
  start: string
  end: string
}

export interface BaseFilter {
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}