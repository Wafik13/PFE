const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const Influx = require('influx');
const redis = require('redis');
const amqp = require('amqplib');
const winston = require('winston');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.ML_PORT || 3006;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/models/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pkl', '.joblib', '.h5', '.pb', '.onnx', '.pt', '.pth'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only ML model files are allowed.'));
    }
  }
});

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ml-service.log' })
  ]
});

// Database connections
const pgPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'it_network',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const influx = new Influx.InfluxDB({
  host: process.env.INFLUX_HOST || 'localhost',
  port: process.env.INFLUX_PORT || 8086,
  database: process.env.INFLUX_DB || 'it_network_metrics',
  username: process.env.INFLUX_USER || 'admin',
  password: process.env.INFLUX_PASSWORD || 'password'
});

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// RabbitMQ for ML pipeline communication
let rabbitmqChannel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitmqChannel = await connection.createChannel();
    
    await rabbitmqChannel.assertExchange('ml_pipeline', 'topic', { durable: true });
    await rabbitmqChannel.assertExchange('ml_inference', 'direct', { durable: true });
    await rabbitmqChannel.assertQueue('training_jobs', { durable: true });
    await rabbitmqChannel.assertQueue('inference_requests', { durable: true });
    await rabbitmqChannel.assertQueue('model_deployment', { durable: true });
    
    logger.info('ML RabbitMQ connected successfully');
  } catch (error) {
    logger.error('ML RabbitMQ connection error:', error);
  }
};

connectRabbitMQ();

app.use(express.json({ limit: '50mb' }));

// Initialize ML database tables
const initMLDB = async () => {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS ml_models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        model_type VARCHAR(100) NOT NULL,
        framework VARCHAR(50) NOT NULL,
        file_path TEXT,
        file_size BIGINT,
        parameters JSONB,
        metrics JSONB,
        training_data_info JSONB,
        status VARCHAR(50) DEFAULT 'registered',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deployed_at TIMESTAMP,
        UNIQUE(name, version)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS ml_experiments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        model_id INTEGER REFERENCES ml_models(id),
        parameters JSONB NOT NULL,
        metrics JSONB,
        artifacts JSONB,
        status VARCHAR(50) DEFAULT 'running',
        started_by VARCHAR(100),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS ml_deployments (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES ml_models(id),
        deployment_name VARCHAR(200) NOT NULL,
        endpoint_url TEXT,
        environment VARCHAR(50) NOT NULL,
        replicas INTEGER DEFAULT 1,
        resource_requirements JSONB,
        configuration JSONB,
        status VARCHAR(50) DEFAULT 'deploying',
        deployed_by VARCHAR(100),
        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_health_check TIMESTAMP,
        health_status VARCHAR(50)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS ml_inference_logs (
        id SERIAL PRIMARY KEY,
        deployment_id INTEGER REFERENCES ml_deployments(id),
        request_id VARCHAR(100) NOT NULL,
        input_data JSONB,
        output_data JSONB,
        inference_time_ms FLOAT,
        model_version VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_ip INET,
        user_id VARCHAR(100)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS feature_store (
        id SERIAL PRIMARY KEY,
        feature_group VARCHAR(200) NOT NULL,
        feature_name VARCHAR(200) NOT NULL,
        feature_type VARCHAR(50) NOT NULL,
        description TEXT,
        data_source VARCHAR(200),
        transformation_logic TEXT,
        validation_rules JSONB,
        statistics JSONB,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(feature_group, feature_name)
      )
    `);
    
    logger.info('ML database tables initialized');
  } catch (error) {
    logger.error('ML database initialization error:', error);
  }
};

initMLDB();

// Utility functions
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const logInference = async (deploymentId, requestId, inputData, outputData, inferenceTime, modelVersion, clientIp, userId) => {
  try {
    await pgPool.query(
      'INSERT INTO ml_inference_logs (deployment_id, request_id, input_data, output_data, inference_time_ms, model_version, client_ip, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [deploymentId, requestId, JSON.stringify(inputData), JSON.stringify(outputData), inferenceTime, modelVersion, clientIp, userId]
    );
    
    // Store metrics in InfluxDB
    await influx.writePoints([{
      measurement: 'ml_inference_metrics',
      fields: {
        inference_time_ms: inferenceTime,
        request_count: 1
      },
      tags: {
        deployment_id: deploymentId.toString(),
        model_version: modelVersion
      },
      timestamp: new Date()
    }]);
  } catch (error) {
    logger.error('Inference logging error:', error);
  }
};

// Routes

// Model management
app.post('/models', upload.single('model_file'), async (req, res) => {
  try {
    const { name, version, description, modelType, framework, parameters, trainingDataInfo, createdBy } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Model file is required' });
    }
    
    const result = await pgPool.query(
      'INSERT INTO ml_models (name, version, description, model_type, framework, file_path, file_size, parameters, training_data_info, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, version, description, modelType, framework, file.path, file.size, JSON.stringify(parameters), JSON.stringify(trainingDataInfo), createdBy]
    );
    
    const model = result.rows[0];
    
    // Publish model registration event
    if (rabbitmqChannel) {
      await rabbitmqChannel.publish('ml_pipeline', 'model.registered', Buffer.from(JSON.stringify({
        modelId: model.id,
        name: model.name,
        version: model.version,
        framework: model.framework,
        timestamp: new Date()
      })));
    }
    
    res.status(201).json({ model });
    logger.info(`Model registered: ${name} v${version}`);
  } catch (error) {
    logger.error('Model registration error:', error);
    res.status(500).json({ error: 'Failed to register model' });
  }
});

app.get('/models', async (req, res) => {
  try {
    const { framework, modelType, status, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM ml_models WHERE 1=1';
    const params = [];
    
    if (framework) {
      params.push(framework);
      query += ` AND framework = $${params.length}`;
    }
    
    if (modelType) {
      params.push(modelType);
      query += ` AND model_type = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    const result = await pgPool.query(query, params);
    res.json({ models: result.rows });
  } catch (error) {
    logger.error('Models fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    const result = await pgPool.query('SELECT * FROM ml_models WHERE id = $1', [modelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json({ model: result.rows[0] });
  } catch (error) {
    logger.error('Model fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

app.put('/models/:modelId/metrics', async (req, res) => {
  try {
    const { modelId } = req.params;
    const { metrics } = req.body;
    
    const result = await pgPool.query(
      'UPDATE ml_models SET metrics = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(metrics), modelId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json({ model: result.rows[0] });
    logger.info(`Model metrics updated: ${modelId}`);
  } catch (error) {
    logger.error('Model metrics update error:', error);
    res.status(500).json({ error: 'Failed to update model metrics' });
  }
});

// Experiment management
app.post('/experiments', async (req, res) => {
  try {
    const { name, description, modelId, parameters, startedBy } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO ml_experiments (name, description, model_id, parameters, started_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, modelId, JSON.stringify(parameters), startedBy]
    );
    
    const experiment = result.rows[0];
    
    // Publish experiment start event
    if (rabbitmqChannel) {
      await rabbitmqChannel.sendToQueue('training_jobs', Buffer.from(JSON.stringify({
        experimentId: experiment.id,
        modelId,
        parameters,
        timestamp: new Date()
      })));
    }
    
    res.status(201).json({ experiment });
    logger.info(`Experiment started: ${name}`);
  } catch (error) {
    logger.error('Experiment creation error:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

app.get('/experiments', async (req, res) => {
  try {
    const { modelId, status, limit = 50 } = req.query;
    
    let query = `
      SELECT e.*, m.name as model_name, m.version as model_version 
      FROM ml_experiments e 
      LEFT JOIN ml_models m ON e.model_id = m.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (modelId) {
      params.push(modelId);
      query += ` AND e.model_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY e.started_at DESC LIMIT $${params.length}`;
    
    const result = await pgPool.query(query, params);
    res.json({ experiments: result.rows });
  } catch (error) {
    logger.error('Experiments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

app.put('/experiments/:experimentId/complete', async (req, res) => {
  try {
    const { experimentId } = req.params;
    const { metrics, artifacts, status = 'completed', errorMessage } = req.body;
    
    const result = await pgPool.query(
      'UPDATE ml_experiments SET metrics = $1, artifacts = $2, status = $3, error_message = $4, completed_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [JSON.stringify(metrics), JSON.stringify(artifacts), status, errorMessage, experimentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    res.json({ experiment: result.rows[0] });
    logger.info(`Experiment completed: ${experimentId}`);
  } catch (error) {
    logger.error('Experiment completion error:', error);
    res.status(500).json({ error: 'Failed to complete experiment' });
  }
});

// Model deployment
app.post('/deployments', async (req, res) => {
  try {
    const { modelId, deploymentName, environment, replicas, resourceRequirements, configuration, deployedBy } = req.body;
    
    // Generate endpoint URL
    const endpointUrl = `${process.env.INFERENCE_BASE_URL || 'http://localhost:8080'}/v1/models/${deploymentName}/predict`;
    
    const result = await pgPool.query(
      'INSERT INTO ml_deployments (model_id, deployment_name, endpoint_url, environment, replicas, resource_requirements, configuration, deployed_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [modelId, deploymentName, endpointUrl, environment, replicas, JSON.stringify(resourceRequirements), JSON.stringify(configuration), deployedBy]
    );
    
    const deployment = result.rows[0];
    
    // Publish deployment event
    if (rabbitmqChannel) {
      await rabbitmqChannel.sendToQueue('model_deployment', Buffer.from(JSON.stringify({
        deploymentId: deployment.id,
        modelId,
        deploymentName,
        environment,
        endpointUrl,
        timestamp: new Date()
      })));
    }
    
    res.status(201).json({ deployment });
    logger.info(`Model deployment initiated: ${deploymentName}`);
  } catch (error) {
    logger.error('Deployment creation error:', error);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

app.get('/deployments', async (req, res) => {
  try {
    const { environment, status, limit = 50 } = req.query;
    
    let query = `
      SELECT d.*, m.name as model_name, m.version as model_version 
      FROM ml_deployments d 
      LEFT JOIN ml_models m ON d.model_id = m.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (environment) {
      params.push(environment);
      query += ` AND d.environment = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY d.deployed_at DESC LIMIT $${params.length}`;
    
    const result = await pgPool.query(query, params);
    res.json({ deployments: result.rows });
  } catch (error) {
    logger.error('Deployments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

app.put('/deployments/:deploymentId/status', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { status, healthStatus } = req.body;
    
    const result = await pgPool.query(
      'UPDATE ml_deployments SET status = $1, health_status = $2, last_health_check = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, healthStatus, deploymentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    res.json({ deployment: result.rows[0] });
    logger.info(`Deployment status updated: ${deploymentId} -> ${status}`);
  } catch (error) {
    logger.error('Deployment status update error:', error);
    res.status(500).json({ error: 'Failed to update deployment status' });
  }
});

// Model inference
app.post('/predict/:deploymentName', async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const inputData = req.body;
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Get deployment info
    const deploymentResult = await pgPool.query(
      'SELECT d.*, m.version as model_version FROM ml_deployments d LEFT JOIN ml_models m ON d.model_id = m.id WHERE d.deployment_name = $1 AND d.status = $2',
      [deploymentName, 'running']
    );
    
    if (deploymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found or not running' });
    }
    
    const deployment = deploymentResult.rows[0];
    
    // Make inference request to Triton server or model endpoint
    let prediction;
    try {
      const response = await axios.post(deployment.endpoint_url, inputData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        timeout: 30000
      });
      prediction = response.data;
    } catch (inferenceError) {
      logger.error('Inference request error:', inferenceError);
      
      // Fallback to mock prediction for demo purposes
      prediction = {
        predictions: [Math.random()],
        model_version: deployment.model_version,
        request_id: requestId,
        status: 'mock_prediction'
      };
    }
    
    const inferenceTime = Date.now() - startTime;
    
    // Log inference
    await logInference(
      deployment.id,
      requestId,
      inputData,
      prediction,
      inferenceTime,
      deployment.model_version,
      req.ip,
      req.user?.id
    );
    
    res.json({
      request_id: requestId,
      prediction,
      inference_time_ms: inferenceTime,
      model_version: deployment.model_version,
      deployment_name: deploymentName
    });
    
    logger.info(`Inference completed: ${deploymentName} (${inferenceTime}ms)`);
  } catch (error) {
    logger.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Feature store management
app.post('/features', async (req, res) => {
  try {
    const { featureGroup, featureName, featureType, description, dataSource, transformationLogic, validationRules, createdBy } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO feature_store (feature_group, feature_name, feature_type, description, data_source, transformation_logic, validation_rules, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [featureGroup, featureName, featureType, description, dataSource, transformationLogic, JSON.stringify(validationRules), createdBy]
    );
    
    res.status(201).json({ feature: result.rows[0] });
    logger.info(`Feature registered: ${featureGroup}.${featureName}`);
  } catch (error) {
    logger.error('Feature registration error:', error);
    res.status(500).json({ error: 'Failed to register feature' });
  }
});

app.get('/features', async (req, res) => {
  try {
    const { featureGroup, featureType } = req.query;
    
    let query = 'SELECT * FROM feature_store WHERE 1=1';
    const params = [];
    
    if (featureGroup) {
      params.push(featureGroup);
      query += ` AND feature_group = $${params.length}`;
    }
    
    if (featureType) {
      params.push(featureType);
      query += ` AND feature_type = $${params.length}`;
    }
    
    query += ' ORDER BY feature_group, feature_name';
    
    const result = await pgPool.query(query, params);
    res.json({ features: result.rows });
  } catch (error) {
    logger.error('Features fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Analytics and monitoring
app.get('/analytics/inference-metrics', async (req, res) => {
  try {
    const { deploymentId, timeRange = '24h', aggregation = 'mean' } = req.query;
    
    let query = `
      SELECT ${aggregation}(inference_time_ms) as avg_inference_time,
             sum(request_count) as total_requests
      FROM ml_inference_metrics
      WHERE time >= now() - ${timeRange}
    `;
    
    if (deploymentId) {
      query += ` AND "deployment_id" = '${deploymentId}'`;
    }
    
    query += ' GROUP BY time(1h) ORDER BY time DESC';
    
    const result = await influx.query(query);
    res.json({ metrics: result });
  } catch (error) {
    logger.error('Inference metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch inference metrics' });
  }
});

app.get('/analytics/model-performance', async (req, res) => {
  try {
    const { modelId, timeRange = '7d' } = req.query;
    
    const query = `
      SELECT 
        DATE_TRUNC('day', timestamp) as date,
        COUNT(*) as inference_count,
        AVG(inference_time_ms) as avg_inference_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY inference_time_ms) as p95_inference_time
      FROM ml_inference_logs il
      JOIN ml_deployments d ON il.deployment_id = d.id
      WHERE d.model_id = $1 
      AND il.timestamp >= NOW() - INTERVAL '${timeRange}'
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
    `;
    
    const result = await pgPool.query(query, [modelId]);
    res.json({ performance: result.rows });
  } catch (error) {
    logger.error('Model performance error:', error);
    res.status(500).json({ error: 'Failed to fetch model performance' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    await influx.ping(5000);
    
    res.json({ 
      status: 'healthy', 
      service: 'ml-service',
      connections: {
        postgresql: 'connected',
        influxdb: 'connected',
        redis: redisClient.connected ? 'connected' : 'disconnected',
        rabbitmq: rabbitmqChannel ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    logger.error('ML health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'ml-service',
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  logger.info(`ML service running on port ${PORT}`);
});

module.exports = app;