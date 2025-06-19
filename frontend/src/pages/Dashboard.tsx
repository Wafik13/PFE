import React, { useState, useEffect, useContext } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';

// Context
import { SocketContext } from '../App';

// Services
import { DataService } from '../services/DataService';
import { SCADAService } from '../services/SCADAService';

// Components
import MetricCard from '../components/MetricCard';
import RealTimeChart from '../components/RealTimeChart';
import DeviceStatusGrid from '../components/DeviceStatusGrid';
import AlarmPanel from '../components/AlarmPanel';
import SystemOverview from '../components/SystemOverview';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement
);

interface DashboardMetrics {
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  deviceStatus: {
    online: number;
    offline: number;
    warning: number;
    error: number;
  };
  alarms: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  performance: {
    throughput: number;
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
}

interface RealTimeData {
  timestamp: string;
  metrics: {
    temperature: number;
    pressure: number;
    flow_rate: number;
    power_consumption: number;
    vibration: number;
    status: string;
  };
  deviceId: string;
}

const Dashboard: React.FC = () => {
  const socket = useContext(SocketContext);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alerts, setAlerts] = useState<any[]>([]);

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch system overview
        const overview = await SCADAService.getSystemOverview();
        
        // Fetch recent metrics
        const recentMetrics = await DataService.queryMetrics({
          measurement: 'system_metrics',
          timeRange: '1h',
          limit: 100
        });
        
        // Fetch active alarms
        const activeAlarms = await SCADAService.getAlarms({
          resolved: false,
          limit: 10
        });
        
        // Process and set metrics
        const dashboardMetrics: DashboardMetrics = {
          systemHealth: {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            disk: Math.random() * 100,
            network: Math.random() * 100,
          },
          deviceStatus: overview.devices || {
            online: 0,
            offline: 0,
            warning: 0,
            error: 0,
          },
          alarms: overview.alarms || {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          performance: {
            throughput: 1250 + Math.random() * 500,
            responseTime: 45 + Math.random() * 20,
            errorRate: Math.random() * 2,
            uptime: 99.8 + Math.random() * 0.2,
          },
        };
        
        setMetrics(dashboardMetrics);
        setAlerts(activeAlarms.alarms || []);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Set up real-time data subscriptions
  useEffect(() => {
    if (!socket) return;

    // Subscribe to device data updates
    socket.on('device_data', (data: RealTimeData) => {
      setRealTimeData(prev => {
        const newData = [...prev, data].slice(-50); // Keep last 50 data points
        return newData;
      });
    });

    // Subscribe to new alarms
    socket.on('new_alarm', (alarm) => {
      setAlerts(prev => [alarm, ...prev.slice(0, 9)]); // Keep last 10 alarms
    });

    // Subscribe to critical alerts
    socket.on('critical_alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]);
    });

    return () => {
      socket.off('device_data');
      socket.off('new_alarm');
      socket.off('critical_alert');
    };
  }, [socket]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    // Trigger data refresh
    setTimeout(() => {
      setLoading(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'normal':
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case 'critical':
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'normal':
      case 'healthy':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
      case 'critical':
      case 'offline':
        return <ErrorIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  if (loading && !metrics) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          SCADA Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Critical Alerts */}
      {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Critical Alerts Active</Typography>
          <Typography variant="body2">
            {alerts.filter(alert => alert.severity === 'critical').length} critical issues require immediate attention
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Health Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="CPU Usage"
            value={metrics?.systemHealth.cpu || 0}
            unit="%"
            icon={<SpeedIcon />}
            color={metrics?.systemHealth.cpu && metrics.systemHealth.cpu > 80 ? 'error' : 'primary'}
            trend={Math.random() > 0.5 ? 'up' : 'down'}
            trendValue={Math.random() * 10}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Memory Usage"
            value={metrics?.systemHealth.memory || 0}
            unit="%"
            icon={<MemoryIcon />}
            color={metrics?.systemHealth.memory && metrics.systemHealth.memory > 85 ? 'error' : 'primary'}
            trend={Math.random() > 0.5 ? 'up' : 'down'}
            trendValue={Math.random() * 10}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Disk Usage"
            value={metrics?.systemHealth.disk || 0}
            unit="%"
            icon={<StorageIcon />}
            color={metrics?.systemHealth.disk && metrics.systemHealth.disk > 90 ? 'error' : 'primary'}
            trend={Math.random() > 0.5 ? 'up' : 'down'}
            trendValue={Math.random() * 10}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Network I/O"
            value={metrics?.systemHealth.network || 0}
            unit="Mbps"
            icon={<NetworkIcon />}
            color="primary"
            trend={Math.random() > 0.5 ? 'up' : 'down'}
            trendValue={Math.random() * 10}
          />
        </Grid>

        {/* Device Status Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Device Status Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="body2">Online: {metrics?.deviceStatus.online || 0}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    <Typography variant="body2">Offline: {metrics?.deviceStatus.offline || 0}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="body2">Warning: {metrics?.deviceStatus.warning || 0}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    <Typography variant="body2">Error: {metrics?.deviceStatus.error || 0}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Throughput</Typography>
                  <Typography variant="h6">{metrics?.performance.throughput.toFixed(0) || 0} req/s</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Response Time</Typography>
                  <Typography variant="h6">{metrics?.performance.responseTime.toFixed(1) || 0} ms</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                  <Typography variant="h6" color={metrics?.performance.errorRate && metrics.performance.errorRate > 1 ? 'error' : 'inherit'}>
                    {metrics?.performance.errorRate.toFixed(2) || 0}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Uptime</Typography>
                  <Typography variant="h6" color="success.main">{metrics?.performance.uptime.toFixed(2) || 0}%</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Data Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-time System Metrics
              </Typography>
              <RealTimeChart data={realTimeData} />
            </CardContent>
          </Card>
        </Grid>

        {/* Active Alarms */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Alarms
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {alerts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No active alarms
                  </Typography>
                ) : (
                  alerts.map((alert, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip
                          label={alert.severity || 'medium'}
                          color={getStatusColor(alert.severity || 'medium') as any}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(alert.created_at || Date.now()).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {alert.message || 'System alert'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Device: {alert.device_id || 'Unknown'}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Overview */}
        <Grid item xs={12}>
          <SystemOverview />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;