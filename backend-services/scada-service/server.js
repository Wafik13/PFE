const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const Influx = require('influx');
const redis = require('redis');
const amqp = require('amqplib');
const winston = require('winston');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.SCADA_PORT || 3005;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scada-service.log' })
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

// RabbitMQ for real-time alerts
let rabbitmqChannel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitmqChannel = await connection.createChannel();
    
    await rabbitmqChannel.assertExchange('scada_alerts', 'topic', { durable: true });
    await rabbitmqChannel.assertExchange('scada_commands', 'direct', { durable: true });
    await rabbitmqChannel.assertQueue('critical_alerts', { durable: true });
    await rabbitmqChannel.assertQueue('system_commands', { durable: true });
    
    // Consume critical alerts
    rabbitmqChannel.consume('critical_alerts', (msg) => {
      if (msg) {
        const alert = JSON.parse(msg.content.toString());
        io.emit('critical_alert', alert);
        rabbitmqChannel.ack(msg);
        logger.warn('Critical alert broadcasted:', alert);
      }
    });
    
    logger.info('SCADA RabbitMQ connected successfully');
  } catch (error) {
    logger.error('SCADA RabbitMQ connection error:', error);
  }
};

connectRabbitMQ();

app.use(express.json());

// Initialize SCADA database tables
const initSCADADB = async () => {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS scada_devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        device_name VARCHAR(200) NOT NULL,
        device_type VARCHAR(50) NOT NULL,
        location VARCHAR(200),
        ip_address INET,
        protocol VARCHAR(50),
        configuration JSONB,
        status VARCHAR(20) DEFAULT 'offline',
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS scada_alarms (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) REFERENCES scada_devices(device_id),
        alarm_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        value FLOAT,
        threshold FLOAT,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by VARCHAR(100),
        acknowledged_at TIMESTAMP,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS scada_commands (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) REFERENCES scada_devices(device_id),
        command_type VARCHAR(50) NOT NULL,
        command_data JSONB NOT NULL,
        issued_by VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        response JSONB,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS scada_dashboards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        layout JSONB NOT NULL,
        widgets JSONB NOT NULL,
        permissions JSONB,
        created_by VARCHAR(100),
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('SCADA database tables initialized');
  } catch (error) {
    logger.error('SCADA database initialization error:', error);
  }
};

initSCADADB();

// Real-time data streaming
const connectedClients = new Map();

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    subscriptions: new Set()
  });
  
  // Subscribe to device data
  socket.on('subscribe_device', (deviceId) => {
    socket.join(`device_${deviceId}`);
    connectedClients.get(socket.id).subscriptions.add(deviceId);
    logger.info(`Client ${socket.id} subscribed to device ${deviceId}`);
  });
  
  // Unsubscribe from device data
  socket.on('unsubscribe_device', (deviceId) => {
    socket.leave(`device_${deviceId}`);
    connectedClients.get(socket.id).subscriptions.delete(deviceId);
    logger.info(`Client ${socket.id} unsubscribed from device ${deviceId}`);
  });
  
  // Subscribe to dashboard updates
  socket.on('subscribe_dashboard', (dashboardId) => {
    socket.join(`dashboard_${dashboardId}`);
    logger.info(`Client ${socket.id} subscribed to dashboard ${dashboardId}`);
  });
  
  // Handle device commands
  socket.on('device_command', async (data) => {
    try {
      const { deviceId, commandType, commandData, userId } = data;
      
      // Store command in database
      const result = await pgPool.query(
        'INSERT INTO scada_commands (device_id, command_type, command_data, issued_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [deviceId, commandType, JSON.stringify(commandData), userId]
      );
      
      const command = result.rows[0];
      
      // Publish command to message queue
      if (rabbitmqChannel) {
        await rabbitmqChannel.publish('scada_commands', deviceId, Buffer.from(JSON.stringify({
          commandId: command.id,
          deviceId,
          commandType,
          commandData,
          issuedBy: userId,
          timestamp: new Date()
        })));
      }
      
      socket.emit('command_queued', { commandId: command.id, status: 'queued' });
      logger.info(`Command queued for device ${deviceId}: ${commandType}`);
    } catch (error) {
      logger.error('Device command error:', error);
      socket.emit('command_error', { error: 'Failed to queue command' });
    }
  });
  
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Simulate real-time data updates (in production, this would come from actual devices)
const simulateRealTimeData = () => {
  setInterval(async () => {
    try {
      const devices = await pgPool.query('SELECT device_id FROM scada_devices WHERE status = $1', ['online']);
      
      for (const device of devices.rows) {
        const deviceData = {
          deviceId: device.device_id,
          timestamp: new Date(),
          metrics: {
            temperature: 20 + Math.random() * 10,
            pressure: 1000 + Math.random() * 100,
            flow_rate: 50 + Math.random() * 20,
            power_consumption: 100 + Math.random() * 50,
            vibration: Math.random() * 5,
            status: Math.random() > 0.95 ? 'warning' : 'normal'
          }
        };
        
        // Emit to subscribed clients
        io.to(`device_${device.device_id}`).emit('device_data', deviceData);
        
        // Store in InfluxDB
        await influx.writePoints([{
          measurement: 'scada_metrics',
          fields: deviceData.metrics,
          tags: { device_id: device.device_id },
          timestamp: deviceData.timestamp
        }]);
        
        // Check for alarms
        if (deviceData.metrics.temperature > 28) {
          await createAlarm(device.device_id, 'temperature', 'high', 
            `High temperature: ${deviceData.metrics.temperature.toFixed(2)}°C`, 
            deviceData.metrics.temperature, 28);
        }
        
        if (deviceData.metrics.pressure > 1080) {
          await createAlarm(device.device_id, 'pressure', 'high', 
            `High pressure: ${deviceData.metrics.pressure.toFixed(2)} Pa`, 
            deviceData.metrics.pressure, 1080);
        }
      }
    } catch (error) {
      logger.error('Real-time data simulation error:', error);
    }
  }, 5000); // Update every 5 seconds
};

// Start real-time simulation
simulateRealTimeData();

// Utility functions
const createAlarm = async (deviceId, alarmType, severity, message, value, threshold) => {
  try {
    const result = await pgPool.query(
      'INSERT INTO scada_alarms (device_id, alarm_type, severity, message, value, threshold) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [deviceId, alarmType, severity, message, value, threshold]
    );
    
    const alarm = result.rows[0];
    
    // Emit alarm to connected clients
    io.emit('new_alarm', alarm);
    
    // Send to critical alerts queue if severity is high
    if (severity === 'critical' && rabbitmqChannel) {
      await rabbitmqChannel.sendToQueue('critical_alerts', Buffer.from(JSON.stringify(alarm)));
    }
    
    logger.warn(`Alarm created: ${alarmType} for device ${deviceId}`);
    return alarm;
  } catch (error) {
    logger.error('Alarm creation error:', error);
  }
};

// Routes

// Device management
app.post('/devices', async (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, location, ipAddress, protocol, configuration } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO scada_devices (device_id, device_name, device_type, location, ip_address, protocol, configuration) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [deviceId, deviceName, deviceType, location, ipAddress, protocol, JSON.stringify(configuration)]
    );
    
    res.status(201).json({ device: result.rows[0] });
    logger.info(`Device registered: ${deviceId}`);
  } catch (error) {
    logger.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

app.get('/devices', async (req, res) => {
  try {
    const { status, type, location } = req.query;
    
    let query = 'SELECT * FROM scada_devices WHERE 1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (type) {
      params.push(type);
      query += ` AND device_type = $${params.length}`;
    }
    
    if (location) {
      params.push(`%${location}%`);
      query += ` AND location ILIKE $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pgPool.query(query, params);
    res.json({ devices: result.rows });
  } catch (error) {
    logger.error('Devices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.put('/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;
    
    const result = await pgPool.query(
      'UPDATE scada_devices SET status = $1, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2 RETURNING *',
      [status, deviceId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Emit status change to connected clients
    io.to(`device_${deviceId}`).emit('device_status_change', {
      deviceId,
      status,
      timestamp: new Date()
    });
    
    res.json({ device: result.rows[0] });
    logger.info(`Device status updated: ${deviceId} -> ${status}`);
  } catch (error) {
    logger.error('Device status update error:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

// Alarm management
app.get('/alarms', async (req, res) => {
  try {
    const { deviceId, severity, acknowledged, resolved, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM scada_alarms WHERE 1=1';
    const params = [];
    
    if (deviceId) {
      params.push(deviceId);
      query += ` AND device_id = $${params.length}`;
    }
    
    if (severity) {
      params.push(severity);
      query += ` AND severity = $${params.length}`;
    }
    
    if (acknowledged !== undefined) {
      params.push(acknowledged === 'true');
      query += ` AND acknowledged = $${params.length}`;
    }
    
    if (resolved !== undefined) {
      params.push(resolved === 'true');
      query += ` AND resolved = $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    const result = await pgPool.query(query, params);
    res.json({ alarms: result.rows });
  } catch (error) {
    logger.error('Alarms fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch alarms' });
  }
});

app.put('/alarms/:alarmId/acknowledge', async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { acknowledgedBy } = req.body;
    
    const result = await pgPool.query(
      'UPDATE scada_alarms SET acknowledged = true, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [acknowledgedBy, alarmId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alarm not found' });
    }
    
    const alarm = result.rows[0];
    io.emit('alarm_acknowledged', alarm);
    
    res.json({ alarm });
    logger.info(`Alarm acknowledged: ${alarmId} by ${acknowledgedBy}`);
  } catch (error) {
    logger.error('Alarm acknowledgment error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alarm' });
  }
});

// Dashboard management
app.post('/dashboards', async (req, res) => {
  try {
    const { name, description, layout, widgets, permissions, createdBy, isPublic } = req.body;
    
    const result = await pgPool.query(
      'INSERT INTO scada_dashboards (name, description, layout, widgets, permissions, created_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, JSON.stringify(layout), JSON.stringify(widgets), JSON.stringify(permissions), createdBy, isPublic]
    );
    
    res.status(201).json({ dashboard: result.rows[0] });
    logger.info(`Dashboard created: ${name}`);
  } catch (error) {
    logger.error('Dashboard creation error:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

app.get('/dashboards', async (req, res) => {
  try {
    const { userId, isPublic } = req.query;
    
    let query = 'SELECT * FROM scada_dashboards WHERE 1=1';
    const params = [];
    
    if (isPublic !== undefined) {
      params.push(isPublic === 'true');
      query += ` AND is_public = $${params.length}`;
    }
    
    if (userId && isPublic !== 'true') {
      params.push(userId);
      query += ` AND (created_by = $${params.length} OR is_public = true)`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pgPool.query(query, params);
    res.json({ dashboards: result.rows });
  } catch (error) {
    logger.error('Dashboards fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// Real-time metrics endpoint
app.get('/metrics/realtime/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { timeRange = '1h' } = req.query;
    
    const query = `
      SELECT * FROM scada_metrics 
      WHERE "device_id" = '${deviceId}' 
      AND time >= now() - ${timeRange} 
      ORDER BY time DESC 
      LIMIT 1000
    `;
    
    const result = await influx.query(query);
    res.json({ metrics: result });
  } catch (error) {
    logger.error('Real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// System overview
app.get('/overview', async (req, res) => {
  try {
    const [devicesResult, alarmsResult, commandsResult] = await Promise.all([
      pgPool.query('SELECT status, COUNT(*) as count FROM scada_devices GROUP BY status'),
      pgPool.query('SELECT severity, COUNT(*) as count FROM scada_alarms WHERE resolved = false GROUP BY severity'),
      pgPool.query('SELECT status, COUNT(*) as count FROM scada_commands WHERE issued_at >= NOW() - INTERVAL \'24 hours\' GROUP BY status')
    ]);
    
    const overview = {
      devices: devicesResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      alarms: alarmsResult.rows.reduce((acc, row) => {
        acc[row.severity] = parseInt(row.count);
        return acc;
      }, {}),
      commands: commandsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      connectedClients: connectedClients.size,
      timestamp: new Date()
    };
    
    res.json({ overview });
  } catch (error) {
    logger.error('Overview fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    await influx.ping(5000);
    
    res.json({ 
      status: 'healthy', 
      service: 'scada-service',
      connectedClients: connectedClients.size,
      connections: {
        postgresql: 'connected',
        influxdb: 'connected',
        redis: redisClient.connected ? 'connected' : 'disconnected',
        rabbitmq: rabbitmqChannel ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    logger.error('SCADA health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'scada-service',
      error: error.message 
    });
  }
});

server.listen(PORT, () => {
  logger.info(`SCADA service running on port ${PORT}`);
  logger.info('WebSocket server initialized for real-time communication');
});

module.exports = { app, server, io };