import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/scada`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Device {
  id: string;
  name: string;
  type: 'PLC' | 'HMI' | 'Sensor' | 'Actuator' | 'Gateway' | 'Controller';
  location: string;
  ipAddress: string;
  port: number;
  protocol: 'modbus' | 'opcua' | 'ethernet_ip' | 'profinet';
  status: 'online' | 'offline' | 'warning' | 'error';
  lastSeen: string;
  firmware: string;
  manufacturer: string;
  model: string;
  tags: Record<string, any>;
  config: Record<string, any>;
  metrics?: {
    temperature?: number;
    pressure?: number;
    power?: number;
    efficiency?: number;
    uptime?: number;
    errorCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Alarm {
  id: string;
  deviceId: string;
  deviceName: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  category: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  tags?: Record<string, string>;
}

export interface Command {
  id: string;
  deviceId: string;
  deviceName: string;
  command: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  executedBy: string;
  executedAt: string;
  completedAt?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: any[];
  widgets: any[];
  permissions: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemOverview {
  devices: {
    online: number;
    offline: number;
    warning: number;
    error: number;
    total: number;
  };
  alarms: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
    unacknowledged: number;
  };
  commands: {
    pending: number;
    executing: number;
    completed: number;
    failed: number;
    total: number;
  };
  performance: {
    avgResponseTime: number;
    dataPoints: number;
    throughput: number;
    uptime: number;
  };
  lastUpdate: string;
}

export interface RealTimeData {
  deviceId: string;
  timestamp: string;
  data: Record<string, any>;
  quality: 'good' | 'uncertain' | 'bad';
}

export class SCADAService {
  /**
   * Get all devices
   */
  static async getDevices(filters?: {
    type?: string;
    status?: string;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ devices: Device[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/devices', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  static async getDevice(id: string): Promise<Device> {
    try {
      const response: AxiosResponse = await apiClient.get(`/devices/${id}`);
      return response.data.device;
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  }

  /**
   * Register a new device
   */
  static async registerDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    try {
      const response: AxiosResponse = await apiClient.post('/devices', device);
      return response.data.device;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Update device
   */
  static async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    try {
      const response: AxiosResponse = await apiClient.put(`/devices/${id}`, updates);
      return response.data.device;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }

  /**
   * Delete device
   */
  static async deleteDevice(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/devices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  }

  /**
   * Update device status
   */
  static async updateDeviceStatus(id: string, status: Device['status'], metrics?: Device['metrics']): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/devices/${id}/status`, { status, metrics });
      return response.data;
    } catch (error) {
      console.error('Error updating device status:', error);
      throw error;
    }
  }

  /**
   * Test device connection
   */
  static async testDeviceConnection(id: string): Promise<{ success: boolean; responseTime: number; message: string }> {
    try {
      const response: AxiosResponse = await apiClient.post(`/devices/${id}/test`);
      return response.data;
    } catch (error) {
      console.error('Error testing device connection:', error);
      throw error;
    }
  }

  /**
   * Get device real-time data
   */
  static async getDeviceRealTimeData(id: string): Promise<RealTimeData> {
    try {
      const response: AxiosResponse = await apiClient.get(`/devices/${id}/realtime`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device real-time data:', error);
      throw error;
    }
  }

  /**
   * Get all alarms
   */
  static async getAlarms(filters?: {
    deviceId?: string;
    severity?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alarms: Alarm[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/alarms', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching alarms:', error);
      throw error;
    }
  }

  /**
   * Get alarm by ID
   */
  static async getAlarm(id: string): Promise<Alarm> {
    try {
      const response: AxiosResponse = await apiClient.get(`/alarms/${id}`);
      return response.data.alarm;
    } catch (error) {
      console.error('Error fetching alarm:', error);
      throw error;
    }
  }

  /**
   * Acknowledge alarm
   */
  static async acknowledgeAlarm(id: string, note?: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/alarms/${id}/acknowledge`, { note });
      return response.data;
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
      throw error;
    }
  }

  /**
   * Resolve alarm
   */
  static async resolveAlarm(id: string, note?: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/alarms/${id}/resolve`, { note });
      return response.data;
    } catch (error) {
      console.error('Error resolving alarm:', error);
      throw error;
    }
  }

  /**
   * Create manual alarm
   */
  static async createAlarm(alarm: Omit<Alarm, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Promise<Alarm> {
    try {
      const response: AxiosResponse = await apiClient.post('/alarms', alarm);
      return response.data.alarm;
    } catch (error) {
      console.error('Error creating alarm:', error);
      throw error;
    }
  }

  /**
   * Get all commands
   */
  static async getCommands(filters?: {
    deviceId?: string;
    status?: string;
    priority?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commands: Command[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/commands', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching commands:', error);
      throw error;
    }
  }

  /**
   * Execute command on device
   */
  static async executeCommand(deviceId: string, command: string, parameters: Record<string, any>, priority: Command['priority'] = 'normal'): Promise<Command> {
    try {
      const response: AxiosResponse = await apiClient.post('/commands', {
        deviceId,
        command,
        parameters,
        priority,
      });
      return response.data.command;
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  /**
   * Cancel command
   */
  static async cancelCommand(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/commands/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling command:', error);
      throw error;
    }
  }

  /**
   * Get command status
   */
  static async getCommandStatus(id: string): Promise<Command> {
    try {
      const response: AxiosResponse = await apiClient.get(`/commands/${id}`);
      return response.data.command;
    } catch (error) {
      console.error('Error fetching command status:', error);
      throw error;
    }
  }

  /**
   * Get all dashboards
   */
  static async getDashboards(): Promise<Dashboard[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/dashboards');
      return response.data.dashboards || [];
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID
   */
  static async getDashboard(id: string): Promise<Dashboard> {
    try {
      const response: AxiosResponse = await apiClient.get(`/dashboards/${id}`);
      return response.data.dashboard;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    }
  }

  /**
   * Create dashboard
   */
  static async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    try {
      const response: AxiosResponse = await apiClient.post('/dashboards', dashboard);
      return response.data.dashboard;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Update dashboard
   */
  static async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    try {
      const response: AxiosResponse = await apiClient.put(`/dashboards/${id}`, updates);
      return response.data.dashboard;
    } catch (error) {
      console.error('Error updating dashboard:', error);
      throw error;
    }
  }

  /**
   * Delete dashboard
   */
  static async deleteDashboard(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/dashboards/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      throw error;
    }
  }

  /**
   * Get system overview
   */
  static async getSystemOverview(): Promise<SystemOverview> {
    try {
      const response: AxiosResponse = await apiClient.get('/overview');
      return response.data;
    } catch (error) {
      console.error('Error fetching system overview:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  static async getRealTimeMetrics(deviceIds?: string[]): Promise<RealTimeData[]> {
    try {
      const params = deviceIds ? { deviceIds: deviceIds.join(',') } : {};
      const response: AxiosResponse = await apiClient.get('/realtime', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get device types and their configurations
   */
  static async getDeviceTypes(): Promise<Array<{
    type: string;
    name: string;
    description: string;
    protocols: string[];
    defaultConfig: Record<string, any>;
    requiredFields: string[];
  }>> {
    try {
      const response: AxiosResponse = await apiClient.get('/device-types');
      return response.data.types || [];
    } catch (error) {
      console.error('Error fetching device types:', error);
      throw error;
    }
  }

  /**
   * Get alarm statistics
   */
  static async getAlarmStatistics(timeRange: string = '24h'): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byDevice: Record<string, number>;
    trends: Array<{ timestamp: string; count: number }>;
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/alarms/statistics', {
        params: { timeRange },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching alarm statistics:', error);
      throw error;
    }
  }

  /**
   * Export system data
   */
  static async exportData(params: {
    type: 'devices' | 'alarms' | 'commands' | 'metrics';
    format: 'csv' | 'json' | 'excel';
    filters?: Record<string, any>;
    startTime?: string;
    endTime?: string;
  }): Promise<Blob> {
    try {
      const response: AxiosResponse = await apiClient.post('/export', params, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Health check for SCADA service
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: Record<string, { status: string; responseTime: number }>;
    deviceConnections: {
      total: number;
      connected: number;
      disconnected: number;
    };
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking SCADA service health:', error);
      throw error;
    }
  }

  /**
   * Get system configuration
   */
  static async getSystemConfig(): Promise<Record<string, any>> {
    try {
      const response: AxiosResponse = await apiClient.get('/config');
      return response.data.config || {};
    } catch (error) {
      console.error('Error fetching system config:', error);
      throw error;
    }
  }

  /**
   * Update system configuration
   */
  static async updateSystemConfig(config: Record<string, any>): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.put('/config', { config });
      return response.data;
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  }
}

export default SCADAService;