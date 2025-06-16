import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudQueue as CloudIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useTheme } from '@mui/material/styles';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  storage: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
  };
  services: {
    running: number;
    total: number;
    failed: number;
  };
  security: {
    threats: number;
    lastScan: string;
    status: 'secure' | 'warning' | 'critical';
  };
}

interface SystemEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  source: string;
}

interface SystemOverviewProps {
  metrics?: SystemMetrics;
  events?: SystemEvent[];
  onRefresh?: () => void;
}

const SystemOverview: React.FC<SystemOverviewProps> = ({
  metrics,
  events = [],
  onRefresh,
}) => {
  const theme = useTheme();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Generate mock data if none provided
  useEffect(() => {
    const generateMockMetrics = (): SystemMetrics => ({
      cpu: {
        usage: 45 + Math.random() * 30,
        cores: 8,
        temperature: 35 + Math.random() * 20,
      },
      memory: {
        used: 12 + Math.random() * 8,
        total: 32,
        usage: 0,
      },
      storage: {
        used: 450 + Math.random() * 200,
        total: 1000,
        usage: 0,
      },
      network: {
        inbound: 150 + Math.random() * 100,
        outbound: 80 + Math.random() * 50,
        latency: 10 + Math.random() * 20,
      },
      services: {
        running: 28 + Math.floor(Math.random() * 4),
        total: 32,
        failed: Math.floor(Math.random() * 3),
      },
      security: {
        threats: Math.floor(Math.random() * 5),
        lastScan: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        status: Math.random() > 0.8 ? 'warning' : 'secure',
      },
    });

    const generateMockEvents = (): SystemEvent[] => {
      const eventTypes: SystemEvent['type'][] = ['info', 'warning', 'error', 'success'];
      const messages = [
        'System backup completed successfully',
        'High CPU usage detected on node-02',
        'Network connectivity restored',
        'Security scan completed - no threats found',
        'Database connection timeout',
        'Service restart completed',
        'Memory usage threshold exceeded',
        'New device connected to network',
        'Configuration update applied',
        'Maintenance window scheduled',
      ];
      const sources = ['System', 'Network', 'Database', 'Security', 'Monitoring'];

      return Array.from({ length: 8 }, (_, i) => ({
        id: `event-${i + 1}`,
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        source: sources[Math.floor(Math.random() * sources.length)],
      }));
    };

    if (!metrics) {
      const mockMetrics = generateMockMetrics();
      mockMetrics.memory.usage = (mockMetrics.memory.used / mockMetrics.memory.total) * 100;
      mockMetrics.storage.usage = (mockMetrics.storage.used / mockMetrics.storage.total) * 100;
      setSystemMetrics(mockMetrics);
    } else {
      setSystemMetrics(metrics);
    }

    if (events.length === 0) {
      setSystemEvents(generateMockEvents());
    } else {
      setSystemEvents(events);
    }
  }, [metrics, events]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Update metrics with small variations
      if (systemMetrics) {
        setSystemMetrics(prev => prev ? {
          ...prev,
          cpu: {
            ...prev.cpu,
            usage: Math.max(0, Math.min(100, prev.cpu.usage + (Math.random() - 0.5) * 10)),
          },
          network: {
            ...prev.network,
            inbound: Math.max(0, prev.network.inbound + (Math.random() - 0.5) * 50),
            outbound: Math.max(0, prev.network.outbound + (Math.random() - 0.5) * 30),
          },
        } : null);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [systemMetrics]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const getEventIcon = (type: SystemEvent['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Chart data for resource usage
  const resourceChartData = {
    labels: ['CPU', 'Memory', 'Storage'],
    datasets: [
      {
        data: [
          systemMetrics?.cpu.usage || 0,
          systemMetrics?.memory.usage || 0,
          systemMetrics?.storage.usage || 0,
        ],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.warning.main,
        ],
        borderWidth: 0,
      },
    ],
  };

  const resourceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
  };

  // Network traffic chart data
  const networkChartData = {
    labels: ['Inbound', 'Outbound'],
    datasets: [
      {
        label: 'Network Traffic (Mbps)',
        data: [
          systemMetrics?.network.inbound || 0,
          systemMetrics?.network.outbound || 0,
        ],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.info.main,
        ],
        borderColor: [
          theme.palette.success.dark,
          theme.palette.info.dark,
        ],
        borderWidth: 1,
      },
    ],
  };

  const networkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
        },
      },
      x: {
        grid: {
          color: theme.palette.divider,
        },
      },
    },
  };

  if (!systemMetrics) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading system overview...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon />
            System Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* System Resources */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {/* CPU */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <SpeedIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">CPU Usage</Typography>
                      <Typography variant="h6">{systemMetrics.cpu.usage.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.cpu.usage}
                    color={getStatusColor(systemMetrics.cpu.usage, { warning: 70, critical: 90 }) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {systemMetrics.cpu.cores} cores • {systemMetrics.cpu.temperature.toFixed(1)}°C
                  </Typography>
                </Paper>
              </Grid>

              {/* Memory */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}>
                      <MemoryIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">Memory Usage</Typography>
                      <Typography variant="h6">{systemMetrics.memory.usage.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.memory.usage}
                    color={getStatusColor(systemMetrics.memory.usage, { warning: 75, critical: 90 }) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatBytes(systemMetrics.memory.used * 1024 * 1024 * 1024)} / {formatBytes(systemMetrics.memory.total * 1024 * 1024 * 1024)}
                  </Typography>
                </Paper>
              </Grid>

              {/* Storage */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <StorageIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">Storage Usage</Typography>
                      <Typography variant="h6">{systemMetrics.storage.usage.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemMetrics.storage.usage}
                    color={getStatusColor(systemMetrics.storage.usage, { warning: 80, critical: 95 }) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatBytes(systemMetrics.storage.used * 1024 * 1024 * 1024)} / {formatBytes(systemMetrics.storage.total * 1024 * 1024 * 1024)}
                  </Typography>
                </Paper>
              </Grid>

              {/* Network */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.light' }}>
                      <NetworkIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">Network</Typography>
                      <Typography variant="h6">{systemMetrics.network.latency.toFixed(0)}ms</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">↓ {systemMetrics.network.inbound.toFixed(1)} Mbps</Typography>
                    <Typography variant="caption">↑ {systemMetrics.network.outbound.toFixed(1)} Mbps</Typography>
                  </Box>
                  <Box sx={{ height: 60 }}>
                    <Bar data={networkChartData} options={networkChartOptions} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Resource Usage Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>Resource Usage</Typography>
              <Box sx={{ height: 200 }}>
                <Doughnut data={resourceChartData} options={resourceChartOptions} />
              </Box>
            </Paper>
          </Grid>

          {/* Services Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Services Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {systemMetrics.services.running}
                    </Typography>
                    <Typography variant="caption">Running</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="text.primary">
                      {systemMetrics.services.total}
                    </Typography>
                    <Typography variant="caption">Total</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {systemMetrics.services.failed}
                    </Typography>
                    <Typography variant="caption">Failed</Typography>
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                <Box>
                  <Typography variant="body2">Security Status</Typography>
                  <Chip
                    label={systemMetrics.security.status.toUpperCase()}
                    color={systemMetrics.security.status === 'secure' ? 'success' : 'warning'}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Last scan: {formatTimeAgo(systemMetrics.security.lastScan)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Recent Events */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Recent Events</Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {systemEvents.slice(0, 5).map((event) => (
                  <ListItem key={event.id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getEventIcon(event.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={event.message}
                      secondary={`${event.source} • ${formatTimeAgo(event.timestamp)}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SystemOverview;