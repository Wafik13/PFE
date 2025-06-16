const express = require('express');
const { Pool } = require('pg');
const Influx = require('influx');
const redis = require('redis');
const amqp = require('amqplib');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.DATA_PORT || 3003;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/data-service.log' })
  ]
});

// PostgreSQL connection for metadata
const pgPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'it_network',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// InfluxDB connection for time-series data
const influx = new Influx.InfluxDB({
  host: process.env.INFLUX_HOST || 'localhost',
  port: process.env.INFLUX_PORT || 8086,
  database: process.env.INFLUX_DB || 'it_network_metrics',
  username: process.env.INFLUX_USER || 'admin',
  password: process.env.INFLUX_PASSWORD || 'password',
  schema: [
    {
      measurement: 'system_metrics',
      fields: {
        cpu_usage: Influx.FieldType.FLOAT,
        memory_usage: Influx.FieldType.FLOAT,
        disk_usage: Influx.FieldType.FLOAT,
        network_in: Influx.FieldType.INTEGER,
        network_out: Influx.FieldType.INTEGER,
        temperature: Influx.FieldType.FLOAT,
        power_consumption: Influx.FieldType.FLOAT
      },
      tags: [
        'host',
        'service',
        'environment',
        'region'
      ]
    },
    {
      measurement: 'application_metrics',
      fields: {
        response_time: Influx.FieldType.FLOAT,
        request_count: Influx.FieldType.INTEGER,
        error_count: Influx.FieldType.INTEGER,
        active_users: Influx.FieldType.INTEGER,
        throughput: Influx.FieldType.FLOAT
      },
      tags: [
        'service_name',
        'endpoint',
        'method',
        'status_code'
      ]
    },
    {
      measurement: 'iot_sensors',
      fields: {
        value: Influx.FieldType.FLOAT,
        status: Influx.FieldType.STRING,
        battery_level: Influx.FieldType.FLOAT
      },
      tags: [
        'sensor_id',
        'sensor_type',
        'location',
        'device_model'
      ]
    }
  ]
});

// Redis client for caching
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

// RabbitMQ connection for message queuing
let rabbitmqChannel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitmqChannel = await connection.createChannel();
    
    // Declare exchanges and queues
    await rabbitmqChannel.assertExchange('data_ingestion', 'topic', { durable: true });
    await rabbitmqChannel.assertExchange('data_processing', 'direct', { durable: true });
    await rabbitmqChannel.assertQueue('metrics_queue', { durable: true });
    await rabbitmqChannel.assertQueue('alerts_queue', { durable: true });
    
    logger.info('RabbitMQ connected successfully');
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
  }
};

connectRabbitMQ();

app.use(express.json({ limit: '50mb' }));

// Initialize databases
const initDatabases = async () => {
  try {
    // Create InfluxDB database
    const databases = await influx.getDatabaseNames();
    if (!databases.includes(process.env.INFLUX_DB || 'it_network_metrics')) {
      await influx.createDatabase(process.env.INFLUX_DB || 'it_network_metrics');
      logger.info('InfluxDB database created');
    }
    
    // Create PostgreSQL tables for metadata
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS data_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        connection_string TEXT,
        configuration JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS data_pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        source_id INTEGER REFERENCES data_sources(id),
        destination_type VARCHAR(50),
        transformation_rules JSONB,
        schedule_cron VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id SERIAL PRIMARY KEY,
        pipeline_id INTEGER REFERENCES data_pipelines(id),
        metric_name VARCHAR(100),
        metric_value FLOAT,
        threshold_min FLOAT,
        threshold_max FLOAT,
        status VARCHAR(20),
        measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('PostgreSQL tables initialized');
  } catch (error) {
    logger.error('Database initialization error:', error);
  }
};

initDatabases();

// Utility functions
const cacheKey = (prefix, ...args) => `${prefix}:${args.join(':')}`;

const getCachedData = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

const setCachedData = async (key, data, ttl = 300) => {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
};

const publishToQueue = async (exchange, routingKey, data) => {
  try {
    if (rabbitmqChannel) {
      await rabbitmqChannel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
    }
  } catch (error) {
    logger.error('Queue publish error:', error);
  }
};

// Routes

// Ingest time-series data
app.post('/ingest/metrics', async (req, res) => {
  try {
    const { measurement, fields, tags, timestamp } = req.body;
    
    if (!measurement || !fields) {
      return res.status(400).json({ error: 'Measurement and fields are required' });
    }
    
    const point = {
      measurement,
      fields,
      tags: tags || {},
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };
    
    await influx.writePoints([point]);
    
    // Publish to message queue for real-time processing
    await publishToQueue('data_ingestion', 'metrics.ingested', {
      measurement,
      fields,
      tags,
      timestamp: point.timestamp
    });
    
    res.json({ message: 'Metrics ingested successfully', point });
    
    logger.info(`Metrics ingested: ${measurement}`);
  } catch (error) {
    logger.error('Metrics ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest metrics' });
  }
});

// Batch ingest multiple metrics
app.post('/ingest/batch', async (req, res) => {
  try {
    const { points } = req.body;
    
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Points array is required' });
    }
    
    const influxPoints = points.map(point => ({
      measurement: point.measurement,
      fields: point.fields,
      tags: point.tags || {},
      timestamp: point.timestamp ? new Date(point.timestamp) : new Date()
    }));
    
    await influx.writePoints(influxPoints);
    
    // Publish batch to message queue
    await publishToQueue('data_ingestion', 'metrics.batch_ingested', {
      count: points.length,
      measurements: [...new Set(points.map(p => p.measurement))]
    });
    
    res.json({ 
      message: 'Batch metrics ingested successfully', 
      count: points.length 
    });
    
    logger.info(`Batch metrics ingested: ${points.length} points`);
  } catch (error) {
    logger.error('Batch ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest batch metrics' });
  }
});

// Query time-series data
app.get('/query/metrics', async (req, res) => {
  try {
    const { 
      measurement, 
      start, 
      end, 
      groupBy, 
      aggregation = 'mean', 
      interval = '1m',
      tags = {},
      limit = 1000
    } = req.query;
    
    if (!measurement) {
      return res.status(400).json({ error: 'Measurement is required' });
    }
    
    // Check cache first
    const cacheKeyStr = cacheKey('query', measurement, start, end, groupBy, aggregation, interval, JSON.stringify(tags));
    const cachedResult = await getCachedData(cacheKeyStr);
    
    if (cachedResult) {
      return res.json({ data: cachedResult, cached: true });
    }
    
    // Build InfluxDB query
    let query = `SELECT ${aggregation}(*) FROM "${measurement}"`;
    
    // Add WHERE conditions
    const conditions = [];
    if (start) conditions.push(`time >= '${start}'`);
    if (end) conditions.push(`time <= '${end}'`);
    
    // Add tag filters
    Object.entries(tags).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        conditions.push(`"${key}" =~ /^(${value.join('|')})$/`);
      } else {
        conditions.push(`"${key}" = '${value}'`);
      }
    });
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add GROUP BY
    if (groupBy) {
      query += ` GROUP BY time(${interval})`;
      if (groupBy !== 'time') {
        query += `, "${groupBy}"`;
      }
    }
    
    query += ` ORDER BY time DESC LIMIT ${limit}`;
    
    const result = await influx.query(query);
    
    // Cache the result
    await setCachedData(cacheKeyStr, result, 60); // Cache for 1 minute
    
    res.json({ data: result, cached: false });
    
    logger.info(`Query executed: ${measurement}`);
  } catch (error) {
    logger.error('Query error:', error);
    res.status(500).json({ error: 'Failed to query metrics' });
  }
});

// Get aggregated statistics
app.get('/stats/:measurement', async (req, res) => {
  try {
    const { measurement } = req.params;
    const { timeRange = '1h', tags = {} } = req.query;
    
    const cacheKeyStr = cacheKey('stats', measurement, timeRange, JSON.stringify(tags));
    const cachedStats = await getCachedData(cacheKeyStr);
    
    if (cachedStats) {
      return res.json({ stats: cachedStats, cached: true });
    }
    
    // Build conditions
    const conditions = [`time >= now() - ${timeRange}`];
    Object.entries(tags).forEach(([key, value]) => {
      conditions.push(`"${key}" = '${value}'`);
    });
    
    const whereClause = conditions.join(' AND ');
    
    const queries = [
      `SELECT COUNT(*) as count FROM "${measurement}" WHERE ${whereClause}`,
      `SELECT MEAN(*) FROM "${measurement}" WHERE ${whereClause}`,
      `SELECT MIN(*) FROM "${measurement}" WHERE ${whereClause}`,
      `SELECT MAX(*) FROM "${measurement}" WHERE ${whereClause}`,
      `SELECT STDDEV(*) FROM "${measurement}" WHERE ${whereClause}`
    ];
    
    const results = await Promise.all(queries.map(q => influx.query(q)));
    
    const stats = {
      count: results[0][0]?.count || 0,
      mean: results[1][0] || {},
      min: results[2][0] || {},
      max: results[3][0] || {},
      stddev: results[4][0] || {},
      timeRange,
      measurement
    };
    
    await setCachedData(cacheKeyStr, stats, 300); // Cache for 5 minutes
    
    res.json({ stats, cached: false });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Data source management
app.post('/sources', async (req, res) => {
  try {
    const { name, type, connectionString, configuration } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO data_sources (name, type, connection_string, configuration) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, connectionString, JSON.stringify(configuration)]
    );
    
    res.status(201).json({ source: result.rows[0] });
    logger.info(`Data source created: ${name}`);
  } catch (error) {
    logger.error('Data source creation error:', error);
    res.status(500).json({ error: 'Failed to create data source' });
  }
});

app.get('/sources', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM data_sources WHERE is_active = true ORDER BY created_at DESC');
    res.json({ sources: result.rows });
  } catch (error) {
    logger.error('Data sources fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch data sources' });
  }
});

// Data pipeline management
app.post('/pipelines', async (req, res) => {
  try {
    const { name, sourceId, destinationType, transformationRules, scheduleCron } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO data_pipelines (name, source_id, destination_type, transformation_rules, schedule_cron) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, sourceId, destinationType, JSON.stringify(transformationRules), scheduleCron]
    );
    
    res.status(201).json({ pipeline: result.rows[0] });
    logger.info(`Data pipeline created: ${name}`);
  } catch (error) {
    logger.error('Pipeline creation error:', error);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

app.get('/pipelines', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT p.*, s.name as source_name, s.type as source_type 
      FROM data_pipelines p 
      LEFT JOIN data_sources s ON p.source_id = s.id 
      WHERE p.is_active = true 
      ORDER BY p.created_at DESC
    `);
    res.json({ pipelines: result.rows });
  } catch (error) {
    logger.error('Pipelines fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check InfluxDB connection
    await influx.ping(5000);
    
    // Check PostgreSQL connection
    await pgPool.query('SELECT 1');
    
    res.json({ 
      status: 'healthy', 
      service: 'data-service',
      connections: {
        influxdb: 'connected',
        postgresql: 'connected',
        redis: redisClient.connected ? 'connected' : 'disconnected',
        rabbitmq: rabbitmqChannel ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'data-service',
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  logger.info(`Data service running on port ${PORT}`);
});

module.exports = app;