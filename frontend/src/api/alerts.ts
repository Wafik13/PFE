import { apiMethods, ApiResponse } from './index'

export interface Alarm {
  id: string
  machine_id: string
  alarm_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  description?: string
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface MLAlert {
  id: string
  machine_id: string
  alert_type: 'prediction' | 'anomaly' | 'maintenance'
  fault_type: string
  confidence: number
  time_to_failure?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendations?: string[]
  timestamp: string
  metadata?: Record<string, any>
}

export interface AlertsFilter {
  machine_id?: string
  severity?: string[]
  acknowledged?: boolean
  resolved?: boolean
  start_time?: string
  end_time?: string
  limit?: number
  offset?: number
}

export interface MLAlertsFilter {
  machine_id?: string
  alert_type?: string[]
  severity?: string[]
  start_time?: string
  end_time?: string
  limit?: number
  offset?: number
}

export interface AcknowledgeAlarmRequest {
  alarm_id: string
  acknowledged_by: string
  notes?: string
}

export interface ResolveAlarmRequest {
  alarm_id: string
  resolved_by: string
  resolution_notes?: string
}

export const alertsApi = {
  /**
   * Get all alarms with optional filtering
   */
  getAlarms: async (filter?: AlertsFilter): Promise<ApiResponse<Alarm[]>> => {
    const params = new URLSearchParams()
    
    if (filter) {
      if (filter.machine_id) params.append('machine_id', filter.machine_id)
      if (filter.severity) filter.severity.forEach(s => params.append('severity', s))
      if (filter.acknowledged !== undefined) params.append('acknowledged', filter.acknowledged.toString())
      if (filter.resolved !== undefined) params.append('resolved', filter.resolved.toString())
      if (filter.start_time) params.append('start_time', filter.start_time)
      if (filter.end_time) params.append('end_time', filter.end_time)
      if (filter.limit) params.append('limit', filter.limit.toString())
      if (filter.offset) params.append('offset', filter.offset.toString())
    }
    
    const url = `/alarms${params.toString() ? `?${params.toString()}` : ''}`
    return apiMethods.get<Alarm[]>(url)
  },

  /**
   * Get alarm by ID
   */
  getAlarmById: async (id: string): Promise<ApiResponse<Alarm>> => {
    return apiMethods.get<Alarm>(`/alarms/${id}`)
  },

  /**
   * Get active alarms (unresolved)
   */
  getActiveAlarms: async (machineId?: string): Promise<ApiResponse<Alarm[]>> => {
    return alertsApi.getAlarms({
      machine_id: machineId,
      resolved: false,
    })
  },

  /**
   * Get critical alarms
   */
  getCriticalAlarms: async (machineId?: string): Promise<ApiResponse<Alarm[]>> => {
    return alertsApi.getAlarms({
      machine_id: machineId,
      severity: ['critical'],
      resolved: false,
    })
  },

  /**
   * Acknowledge an alarm
   */
  acknowledgeAlarm: async (request: AcknowledgeAlarmRequest): Promise<ApiResponse<Alarm>> => {
    return apiMethods.patch<Alarm>(`/alarms/${request.alarm_id}/acknowledge`, {
      acknowledged_by: request.acknowledged_by,
      notes: request.notes,
    })
  },

  /**
   * Resolve an alarm
   */
  resolveAlarm: async (request: ResolveAlarmRequest): Promise<ApiResponse<Alarm>> => {
    return apiMethods.patch<Alarm>(`/alarms/${request.alarm_id}/resolve`, {
      resolved_by: request.resolved_by,
      resolution_notes: request.resolution_notes,
    })
  },

  /**
   * Get ML alerts with optional filtering
   */
  getMLAlerts: async (filter?: MLAlertsFilter): Promise<ApiResponse<MLAlert[]>> => {
    const params = new URLSearchParams()
    
    if (filter) {
      if (filter.machine_id) params.append('machine_id', filter.machine_id)
      if (filter.alert_type) filter.alert_type.forEach(t => params.append('alert_type', t))
      if (filter.severity) filter.severity.forEach(s => params.append('severity', s))
      if (filter.start_time) params.append('start_time', filter.start_time)
      if (filter.end_time) params.append('end_time', filter.end_time)
      if (filter.limit) params.append('limit', filter.limit.toString())
      if (filter.offset) params.append('offset', filter.offset.toString())
    }
    
    const url = `/alerts${params.toString() ? `?${params.toString()}` : ''}`
    return apiMethods.get<MLAlert[]>(url)
  },

  /**
   * Get ML alert by ID
   */
  getMLAlertById: async (id: string): Promise<ApiResponse<MLAlert>> => {
    return apiMethods.get<MLAlert>(`/alerts/${id}`)
  },

  /**
   * Get predictive maintenance alerts
   */
  getPredictiveAlerts: async (machineId?: string): Promise<ApiResponse<MLAlert[]>> => {
    return alertsApi.getMLAlerts({
      machine_id: machineId,
      alert_type: ['prediction', 'maintenance'],
    })
  },

  /**
   * Get anomaly detection alerts
   */
  getAnomalyAlerts: async (machineId?: string): Promise<ApiResponse<MLAlert[]>> => {
    return alertsApi.getMLAlerts({
      machine_id: machineId,
      alert_type: ['anomaly'],
    })
  },

  /**
   * Get alerts summary/statistics
   */
  getAlertsSummary: async (machineId?: string): Promise<ApiResponse<{
    total_alarms: number
    active_alarms: number
    critical_alarms: number
    total_ml_alerts: number
    recent_predictions: number
    by_severity: Record<string, number>
    by_machine: Record<string, number>
  }>> => {
    const params = machineId ? `?machine_id=${machineId}` : ''
    return apiMethods.get(`/alerts/summary${params}`)
  },

  /**
   * Get alerts trends/analytics
   */
  getAlertsTrends: async (
    machineId?: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<ApiResponse<{
    period: string
    data: Array<{
      date: string
      alarms_count: number
      ml_alerts_count: number
      critical_count: number
    }>
  }>> => {
    const params = new URLSearchParams()
    if (machineId) params.append('machine_id', machineId)
    params.append('period', period)
    
    return apiMethods.get(`/alerts/trends?${params.toString()}`)
  },
}