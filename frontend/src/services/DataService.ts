import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/data`,
  timeout: 10000,
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
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface MetricQuery {
  measurement: string;
  fields?: string[];
  tags?: Record<string, string>;
  timeRange?: string; // e.g., '1h', '24h', '7d'
  startTime?: string;
  endTime?: string;
  groupBy?: string;
  aggregation?: 'mean' | 'sum' | 'max' | 'min' | 'count';
  interval?: string;
  limit?: number;
}

export interface MetricData {
  timestamp: string;
  value: number;
  tags?: Record<string, string>;
  fields?: Record<string, any>;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'influxdb' | 'postgresql' | 'mqtt' | 'modbus' | 'opcua';
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataPipeline {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  transformations: any[];
  schedule: string;
  status: 'active' | 'inactive' | 'error';
  lastRun: string;
  nextRun: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataStats {
  totalRecords: number;
  recordsToday: number;
  recordsThisWeek: number;
  recordsThisMonth: number;
  avgRecordsPerDay: number;
  dataSourcesCount: number;
  activePipelinesCount: number;
  storageUsed: number;
  lastUpdate: string;
}

export class DataService {
  /**
   * Query metrics from InfluxDB
   */
  static async queryMetrics(query: MetricQuery): Promise<{ data: MetricData[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.post('/query', query);
      return response.data;
    } catch (error) {
      console.error('Error querying metrics:', error);
      throw error;
    }
  }

  /**
   * Ingest data into the system
   */
  static async ingestData(data: {
    measurement: string;
    tags?: Record<string, string>;
    fields: Record<string, any>;
    timestamp?: string;
  }[]): Promise<{ success: boolean; inserted: number }> {
    try {
      const response: AxiosResponse = await apiClient.post('/ingest', { data });
      return response.data;
    } catch (error) {
      console.error('Error ingesting data:', error);
      throw error;
    }
  }

  /**
   * Get data statistics
   */
  static async getStats(): Promise<DataStats> {
    try {
      const response: AxiosResponse = await apiClient.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching data stats:', error);
      throw error;
    }
  }

  /**
   * Get all data sources
   */
  static async getDataSources(): Promise<DataSource[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/sources');
      return response.data.sources || [];
    } catch (error) {
      console.error('Error fetching data sources:', error);
      throw error;
    }
  }

  /**
   * Create a new data source
   */
  static async createDataSource(source: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSource> {
    try {
      const response: AxiosResponse = await apiClient.post('/sources', source);
      return response.data.source;
    } catch (error) {
      console.error('Error creating data source:', error);
      throw error;
    }
  }

  /**
   * Update a data source
   */
  static async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    try {
      const response: AxiosResponse = await apiClient.put(`/sources/${id}`, updates);
      return response.data.source;
    } catch (error) {
      console.error('Error updating data source:', error);
      throw error;
    }
  }

  /**
   * Delete a data source
   */
  static async deleteDataSource(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/sources/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting data source:', error);
      throw error;
    }
  }

  /**
   * Test data source connection
   */
  static async testDataSource(config: Record<string, any>): Promise<{ success: boolean; message: string }> {
    try {
      const response: AxiosResponse = await apiClient.post('/sources/test', { config });
      return response.data;
    } catch (error) {
      console.error('Error testing data source:', error);
      throw error;
    }
  }

  /**
   * Get all data pipelines
   */
  static async getDataPipelines(): Promise<DataPipeline[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/pipelines');
      return response.data.pipelines || [];
    } catch (error) {
      console.error('Error fetching data pipelines:', error);
      throw error;
    }
  }

  /**
   * Create a new data pipeline
   */
  static async createDataPipeline(pipeline: Omit<DataPipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataPipeline> {
    try {
      const response: AxiosResponse = await apiClient.post('/pipelines', pipeline);
      return response.data.pipeline;
    } catch (error) {
      console.error('Error creating data pipeline:', error);
      throw error;
    }
  }

  /**
   * Update a data pipeline
   */
  static async updateDataPipeline(id: string, updates: Partial<DataPipeline>): Promise<DataPipeline> {
    try {
      const response: AxiosResponse = await apiClient.put(`/pipelines/${id}`, updates);
      return response.data.pipeline;
    } catch (error) {
      console.error('Error updating data pipeline:', error);
      throw error;
    }
  }

  /**
   * Delete a data pipeline
   */
  static async deleteDataPipeline(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/pipelines/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting data pipeline:', error);
      throw error;
    }
  }

  /**
   * Run a data pipeline manually
   */
  static async runDataPipeline(id: string): Promise<{ success: boolean; jobId: string }> {
    try {
      const response: AxiosResponse = await apiClient.post(`/pipelines/${id}/run`);
      return response.data;
    } catch (error) {
      console.error('Error running data pipeline:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics (for dashboard)
   */
  static async getRealTimeMetrics(deviceIds?: string[]): Promise<MetricData[]> {
    try {
      const params = deviceIds ? { deviceIds: deviceIds.join(',') } : {};
      const response: AxiosResponse = await apiClient.get('/realtime', { params });
      return response.data.metrics || [];
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get historical data for a specific time range
   */
  static async getHistoricalData(params: {
    measurement: string;
    startTime: string;
    endTime: string;
    interval?: string;
    aggregation?: string;
  }): Promise<MetricData[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/historical', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Export data to various formats
   */
  static async exportData(params: {
    query: MetricQuery;
    format: 'csv' | 'json' | 'excel';
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
   * Get data quality metrics
   */
  static async getDataQuality(): Promise<{
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
    issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      count: number;
    }>;
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/quality');
      return response.data;
    } catch (error) {
      console.error('Error fetching data quality metrics:', error);
      throw error;
    }
  }

  /**
   * Health check for data service
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: Record<string, { status: string; responseTime: number }>;
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking data service health:', error);
      throw error;
    }
  }
}

export default DataService;