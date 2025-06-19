import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/ml`,
  timeout: 30000, // ML operations can take longer
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

export interface MLModel {
  id: string;
  name: string;
  description: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection' | 'forecasting' | 'optimization';
  algorithm: string;
  version: string;
  status: 'training' | 'trained' | 'deployed' | 'failed' | 'archived';
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  mae?: number;
  r2Score?: number;
  trainingData: {
    source: string;
    features: string[];
    target: string;
    size: number;
    startDate: string;
    endDate: string;
  };
  hyperparameters: Record<string, any>;
  artifacts: {
    modelFile: string;
    configFile: string;
    metricsFile: string;
    plotsFile?: string;
  };
  deployment?: {
    endpoint: string;
    instances: number;
    cpuLimit: string;
    memoryLimit: string;
    autoScale: boolean;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  trainedAt?: string;
  deployedAt?: string;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  modelType: MLModel['type'];
  algorithm: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  config: {
    dataSource: string;
    features: string[];
    target: string;
    testSize: number;
    crossValidation: number;
    hyperparameters: Record<string, any>;
    preprocessing: Record<string, any>;
  };
  results?: {
    metrics: Record<string, number>;
    plots: string[];
    featureImportance?: Array<{ feature: string; importance: number }>;
    confusionMatrix?: number[][];
    predictions?: Array<{ actual: number; predicted: number }>;
  };
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
  duration?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Deployment {
  id: string;
  modelId: string;
  modelName: string;
  modelVersion: string;
  name: string;
  description: string;
  status: 'deploying' | 'running' | 'stopped' | 'failed' | 'updating';
  endpoint: string;
  instances: number;
  resources: {
    cpu: string;
    memory: string;
    gpu?: string;
  };
  autoScale: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
  };
  metrics: {
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    uptime: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      message: string;
    }>;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
}

export interface FeatureStore {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  features: Array<{
    name: string;
    type: 'numerical' | 'categorical' | 'boolean' | 'datetime' | 'text';
    description: string;
    nullable: boolean;
    defaultValue?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: any[];
    };
  }>;
  transformations: Array<{
    name: string;
    type: 'scaling' | 'encoding' | 'imputation' | 'feature_engineering';
    config: Record<string, any>;
  }>;
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  status: 'active' | 'inactive' | 'updating' | 'error';
  lastUpdate: string;
  recordCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionRequest {
  modelId: string;
  data: Record<string, any> | Array<Record<string, any>>;
  options?: {
    returnProbabilities?: boolean;
    returnFeatureImportance?: boolean;
    explainPrediction?: boolean;
  };
}

export interface PredictionResponse {
  predictions: any[];
  probabilities?: number[][];
  featureImportance?: Array<{ feature: string; importance: number }>;
  explanations?: Array<{
    prediction: any;
    confidence: number;
    factors: Array<{ feature: string; contribution: number }>;
  }>;
  metadata: {
    modelId: string;
    modelVersion: string;
    timestamp: string;
    processingTime: number;
  };
}

export interface Analytics {
  models: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    accuracy: {
      avg: number;
      min: number;
      max: number;
    };
  };
  experiments: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    avgDuration: number;
  };
  deployments: {
    total: number;
    running: number;
    stopped: number;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
  };
  predictions: {
    totalToday: number;
    totalWeek: number;
    totalMonth: number;
    trends: Array<{ date: string; count: number }>;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    storageUsage: number;
  };
}

export class MLService {
  /**
   * Get all ML models
   */
  static async getModels(filters?: {
    type?: string;
    status?: string;
    algorithm?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ models: MLModel[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/models', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  static async getModel(id: string): Promise<MLModel> {
    try {
      const response: AxiosResponse = await apiClient.get(`/models/${id}`);
      return response.data.model;
    } catch (error) {
      console.error('Error fetching model:', error);
      throw error;
    }
  }

  /**
   * Create a new ML model
   */
  static async createModel(model: Omit<MLModel, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MLModel> {
    try {
      const response: AxiosResponse = await apiClient.post('/models', model);
      return response.data.model;
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }

  /**
   * Update ML model
   */
  static async updateModel(id: string, updates: Partial<MLModel>): Promise<MLModel> {
    try {
      const response: AxiosResponse = await apiClient.put(`/models/${id}`, updates);
      return response.data.model;
    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }

  /**
   * Delete ML model
   */
  static async deleteModel(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/models/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Train ML model
   */
  static async trainModel(id: string, config?: {
    dataSource?: string;
    features?: string[];
    target?: string;
    hyperparameters?: Record<string, any>;
  }): Promise<{ success: boolean; experimentId: string }> {
    try {
      const response: AxiosResponse = await apiClient.post(`/models/${id}/train`, config);
      return response.data;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }

  /**
   * Deploy ML model
   */
  static async deployModel(id: string, config: {
    name: string;
    description?: string;
    instances?: number;
    resources?: {
      cpu?: string;
      memory?: string;
      gpu?: string;
    };
    autoScale?: {
      enabled?: boolean;
      minInstances?: number;
      maxInstances?: number;
      targetCPU?: number;
    };
  }): Promise<Deployment> {
    try {
      const response: AxiosResponse = await apiClient.post(`/models/${id}/deploy`, config);
      return response.data.deployment;
    } catch (error) {
      console.error('Error deploying model:', error);
      throw error;
    }
  }

  /**
   * Get model metrics and performance
   */
  static async getModelMetrics(id: string, timeRange?: string): Promise<{
    accuracy: number[];
    precision: number[];
    recall: number[];
    f1Score: number[];
    timestamps: string[];
    predictions: {
      total: number;
      correct: number;
      incorrect: number;
    };
    performance: {
      avgResponseTime: number;
      throughput: number;
      errorRate: number;
    };
  }> {
    try {
      const params = timeRange ? { timeRange } : {};
      const response: AxiosResponse = await apiClient.get(`/models/${id}/metrics`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching model metrics:', error);
      throw error;
    }
  }

  /**
   * Get all experiments
   */
  static async getExperiments(filters?: {
    modelType?: string;
    status?: string;
    algorithm?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ experiments: Experiment[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/experiments', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching experiments:', error);
      throw error;
    }
  }

  /**
   * Get experiment by ID
   */
  static async getExperiment(id: string): Promise<Experiment> {
    try {
      const response: AxiosResponse = await apiClient.get(`/experiments/${id}`);
      return response.data.experiment;
    } catch (error) {
      console.error('Error fetching experiment:', error);
      throw error;
    }
  }

  /**
   * Create and run experiment
   */
  static async createExperiment(experiment: Omit<Experiment, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt' | 'logs'>): Promise<Experiment> {
    try {
      const response: AxiosResponse = await apiClient.post('/experiments', experiment);
      return response.data.experiment;
    } catch (error) {
      console.error('Error creating experiment:', error);
      throw error;
    }
  }

  /**
   * Cancel experiment
   */
  static async cancelExperiment(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/experiments/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling experiment:', error);
      throw error;
    }
  }

  /**
   * Get experiment logs
   */
  static async getExperimentLogs(id: string): Promise<Experiment['logs']> {
    try {
      const response: AxiosResponse = await apiClient.get(`/experiments/${id}/logs`);
      return response.data.logs || [];
    } catch (error) {
      console.error('Error fetching experiment logs:', error);
      throw error;
    }
  }

  /**
   * Get all deployments
   */
  static async getDeployments(filters?: {
    modelId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ deployments: Deployment[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/deployments', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching deployments:', error);
      throw error;
    }
  }

  /**
   * Get deployment by ID
   */
  static async getDeployment(id: string): Promise<Deployment> {
    try {
      const response: AxiosResponse = await apiClient.get(`/deployments/${id}`);
      return response.data.deployment;
    } catch (error) {
      console.error('Error fetching deployment:', error);
      throw error;
    }
  }

  /**
   * Update deployment
   */
  static async updateDeployment(id: string, updates: {
    instances?: number;
    resources?: Deployment['resources'];
    autoScale?: Deployment['autoScale'];
  }): Promise<Deployment> {
    try {
      const response: AxiosResponse = await apiClient.put(`/deployments/${id}`, updates);
      return response.data.deployment;
    } catch (error) {
      console.error('Error updating deployment:', error);
      throw error;
    }
  }

  /**
   * Stop deployment
   */
  static async stopDeployment(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/deployments/${id}/stop`);
      return response.data;
    } catch (error) {
      console.error('Error stopping deployment:', error);
      throw error;
    }
  }

  /**
   * Start deployment
   */
  static async startDeployment(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/deployments/${id}/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting deployment:', error);
      throw error;
    }
  }

  /**
   * Delete deployment
   */
  static async deleteDeployment(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/deployments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting deployment:', error);
      throw error;
    }
  }

  /**
   * Make prediction using deployed model
   */
  static async predict(request: PredictionRequest): Promise<PredictionResponse> {
    try {
      const response: AxiosResponse = await apiClient.post('/predict', request);
      return response.data;
    } catch (error) {
      console.error('Error making prediction:', error);
      throw error;
    }
  }

  /**
   * Batch prediction
   */
  static async batchPredict(modelId: string, data: Array<Record<string, any>>, options?: {
    returnProbabilities?: boolean;
    chunkSize?: number;
  }): Promise<{
    predictions: any[];
    probabilities?: number[][];
    metadata: {
      modelId: string;
      totalRecords: number;
      processingTime: number;
      timestamp: string;
    };
  }> {
    try {
      const response: AxiosResponse = await apiClient.post('/predict/batch', {
        modelId,
        data,
        options,
      });
      return response.data;
    } catch (error) {
      console.error('Error making batch prediction:', error);
      throw error;
    }
  }

  /**
   * Get feature stores
   */
  static async getFeatureStores(): Promise<FeatureStore[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/feature-store');
      return response.data.featureStores || [];
    } catch (error) {
      console.error('Error fetching feature stores:', error);
      throw error;
    }
  }

  /**
   * Get feature store by ID
   */
  static async getFeatureStore(id: string): Promise<FeatureStore> {
    try {
      const response: AxiosResponse = await apiClient.get(`/feature-store/${id}`);
      return response.data.featureStore;
    } catch (error) {
      console.error('Error fetching feature store:', error);
      throw error;
    }
  }

  /**
   * Create feature store
   */
  static async createFeatureStore(featureStore: Omit<FeatureStore, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastUpdate' | 'recordCount'>): Promise<FeatureStore> {
    try {
      const response: AxiosResponse = await apiClient.post('/feature-store', featureStore);
      return response.data.featureStore;
    } catch (error) {
      console.error('Error creating feature store:', error);
      throw error;
    }
  }

  /**
   * Update feature store
   */
  static async updateFeatureStore(id: string, updates: Partial<FeatureStore>): Promise<FeatureStore> {
    try {
      const response: AxiosResponse = await apiClient.put(`/feature-store/${id}`, updates);
      return response.data.featureStore;
    } catch (error) {
      console.error('Error updating feature store:', error);
      throw error;
    }
  }

  /**
   * Delete feature store
   */
  static async deleteFeatureStore(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/feature-store/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting feature store:', error);
      throw error;
    }
  }

  /**
   * Get features from feature store
   */
  static async getFeatures(featureStoreId: string, filters?: {
    features?: string[];
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    features: Array<Record<string, any>>;
    total: number;
    schema: FeatureStore['features'];
  }> {
    try {
      const response: AxiosResponse = await apiClient.get(`/feature-store/${featureStoreId}/features`, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching features:', error);
      throw error;
    }
  }

  /**
   * Get ML analytics and statistics
   */
  static async getAnalytics(timeRange: string = '7d'): Promise<Analytics> {
    try {
      const response: AxiosResponse = await apiClient.get('/analytics', {
        params: { timeRange },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ML analytics:', error);
      throw error;
    }
  }

  /**
   * Get available algorithms and their configurations
   */
  static async getAlgorithms(): Promise<Array<{
    name: string;
    type: MLModel['type'];
    description: string;
    hyperparameters: Array<{
      name: string;
      type: 'int' | 'float' | 'string' | 'boolean' | 'choice';
      default: any;
      min?: number;
      max?: number;
      choices?: any[];
      description: string;
    }>;
    requirements: {
      minSamples: number;
      supportedTargets: string[];
      supportedFeatures: string[];
    };
  }>> {
    try {
      const response: AxiosResponse = await apiClient.get('/algorithms');
      return response.data.algorithms || [];
    } catch (error) {
      console.error('Error fetching algorithms:', error);
      throw error;
    }
  }

  /**
   * Upload model file
   */
  static async uploadModel(file: File, metadata: {
    name: string;
    description: string;
    type: MLModel['type'];
    algorithm: string;
    version: string;
  }): Promise<MLModel> {
    try {
      const formData = new FormData();
      formData.append('model', file);
      formData.append('metadata', JSON.stringify(metadata));

      const response: AxiosResponse = await apiClient.post('/models/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.model;
    } catch (error) {
      console.error('Error uploading model:', error);
      throw error;
    }
  }

  /**
   * Download model artifacts
   */
  static async downloadModel(id: string, artifactType: 'model' | 'config' | 'metrics' | 'plots' = 'model'): Promise<Blob> {
    try {
      const response: AxiosResponse = await apiClient.get(`/models/${id}/download`, {
        params: { type: artifactType },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error;
    }
  }

  /**
   * Health check for ML service
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: Record<string, { status: string; responseTime: number }>;
    resources: {
      cpu: number;
      memory: number;
      gpu?: number;
      storage: number;
    };
    models: {
      total: number;
      deployed: number;
      training: number;
    };
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking ML service health:', error);
      throw error;
    }
  }
}

export default MLService;