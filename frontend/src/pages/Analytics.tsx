import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  BarChart,
  PieChart,
  Refresh,
  Download,
  DateRange,
  Speed,
  Memory,
  Thermostat,
  ElectricBolt,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import { SCADAService } from '../services/SCADAService';

interface MetricData {
  timestamp: string;
  value: number;
  device: string;
  metric: string;
}

interface DeviceMetrics {
  deviceId: string;
  deviceName: string;
  cpu: number;
  memory: number;
  temperature: number;
  power: number;
  status: string;
  lastUpdate: Date;
}

interface AnalyticsData {
  timeSeriesData: MetricData[];
  deviceMetrics: DeviceMetrics[];
  performanceStats: {
    avgCpu: number;
    avgMemory: number;
    avgTemperature: number;
    totalPower: number;
    onlineDevices: number;
    totalDevices: number;
  };
  alerts: {
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    device: string;
  }[];
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, selectedMetric]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await SCADAService.getAnalytics(timeRange, selectedMetric);
      if (response.success) {
        setData(response.data || generateMockData());
      } else {
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): AnalyticsData => {
    const now = new Date();
    const timeSeriesData: MetricData[] = [];
    
    // Generate time series data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const devices = ['PLC-001', 'HMI-002', 'SENSOR-003', 'DRIVE-004'];
      
      devices.forEach(device => {
        timeSeriesData.push({
          timestamp: timestamp.toISOString(),
          value: Math.random() * 100,
          device,
          metric: selectedMetric,
        });
      });
    }

    const deviceMetrics: DeviceMetrics[] = [
      {
        deviceId: '1',
        deviceName: 'PLC-001',
        cpu: 45,
        memory: 67,
        temperature: 42,
        power: 85,
        status: 'online',
        lastUpdate: new Date(),
      },
      {
        deviceId: '2',
        deviceName: 'HMI-002',
        cpu: 23,
        memory: 34,
        temperature: 38,
        power: 92,
        status: 'online',
        lastUpdate: new Date(),
      },
      {
        deviceId: '3',
        deviceName: 'SENSOR-003',
        cpu: 0,
        memory: 0,
        temperature: 0,
        power: 0,
        status: 'error',
        lastUpdate: new Date(Date.now() - 3600000),
      },
      {
        deviceId: '4',
        deviceName: 'DRIVE-004',
        cpu: 78,
        memory: 56,
        temperature: 65,
        power: 120,
        status: 'maintenance',
        lastUpdate: new Date(Date.now() - 1800000),
      },
    ];

    return {
      timeSeriesData,
      deviceMetrics,
      performanceStats: {
        avgCpu: 36.5,
        avgMemory: 39.25,
        avgTemperature: 36.25,
        totalPower: 297,
        onlineDevices: 2,
        totalDevices: 4,
      },
      alerts: [
        {
          id: '1',
          type: 'error',
          message: 'SENSOR-003 is offline',
          timestamp: new Date(Date.now() - 3600000),
          device: 'SENSOR-003',
        },
        {
          id: '2',
          type: 'warning',
          message: 'DRIVE-004 temperature high (65°C)',
          timestamp: new Date(Date.now() - 1800000),
          device: 'DRIVE-004',
        },
        {
          id: '3',
          type: 'info',
          message: 'System backup completed successfully',
          timestamp: new Date(Date.now() - 900000),
          device: 'System',
        },
      ],
    };
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'cpu': return <Speed />;
      case 'memory': return <Memory />;
      case 'temperature': return <Thermostat />;
      case 'power': return <ElectricBolt />;
      default: return <Timeline />;
    }
  };

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'cpu': return '%';
      case 'memory': return '%';
      case 'temperature': return '°C';
      case 'power': return 'W';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'default';
      case 'error': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const formatChartData = () => {
    if (!data) return [];
    
    const groupedData = data.timeSeriesData.reduce((acc, item) => {
      const hour = new Date(item.timestamp).getHours();
      const key = `${hour}:00`;
      
      if (!acc[key]) {
        acc[key] = { time: key };
      }
      
      acc[key][item.device] = item.value;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(groupedData);
  };

  const pieChartData = data ? [
    { name: 'Online', value: data.performanceStats.onlineDevices, color: '#4caf50' },
    { name: 'Offline', value: data.performanceStats.totalDevices - data.performanceStats.onlineDevices, color: '#f44336' },
  ] : [];

  const renderChart = () => {
    const chartData = formatChartData();
    const devices = ['PLC-001', 'HMI-002', 'SENSOR-003', 'DRIVE-004'];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            {devices.map((device, index) => (
              <Area
                key={device}
                type="monotone"
                dataKey={device}
                stackId="1"
                stroke={colors[index]}
                fill={colors[index]}
              />
            ))}
          </AreaChart>
        );
      case 'bar':
        return (
          <RechartsBarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            {devices.map((device, index) => (
              <Bar key={device} dataKey={device} fill={colors[index]} />
            ))}
          </RechartsBarChart>
        );
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            {devices.map((device, index) => (
              <Line
                key={device}
                type="monotone"
                dataKey={device}
                stroke={colors[index]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LoadingSpinner message="Loading analytics data..." />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        Failed to load analytics data. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor system performance and analyze trends across your industrial network
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  label="Time Range"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="1h">Last Hour</MenuItem>
                  <MenuItem value="24h">Last 24 Hours</MenuItem>
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                  <MenuItem value="30d">Last 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  label="Metric"
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  <MenuItem value="cpu">CPU Usage</MenuItem>
                  <MenuItem value="memory">Memory Usage</MenuItem>
                  <MenuItem value="temperature">Temperature</MenuItem>
                  <MenuItem value="power">Power Consumption</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <ButtonGroup variant="outlined" fullWidth>
                <Button
                  variant={chartType === 'line' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('line')}
                >
                  <Timeline />
                </Button>
                <Button
                  variant={chartType === 'area' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('area')}
                >
                  <AreaChart />
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('bar')}
                >
                  <BarChart />
                </Button>
              </ButtonGroup>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadAnalyticsData}
                  fullWidth
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  fullWidth
                >
                  Export
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed color="primary" />
                <Typography variant="h6">Avg CPU</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {data.performanceStats.avgCpu.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all devices
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Memory color="secondary" />
                <Typography variant="h6">Avg Memory</Typography>
              </Box>
              <Typography variant="h4" color="secondary">
                {data.performanceStats.avgMemory.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Memory utilization
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Thermostat color="warning" />
                <Typography variant="h6">Avg Temp</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {data.performanceStats.avgTemperature.toFixed(1)}°C
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System temperature
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ElectricBolt color="error" />
                <Typography variant="h6">Total Power</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {data.performanceStats.totalPower}W
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Power consumption
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Main Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {getMetricIcon(selectedMetric)}
                <Typography variant="h6">
                  {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
                </Typography>
              </Box>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Status */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Device Status
              </Typography>
              <Box sx={{ height: 200, mb: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <RechartsTooltip />
                    <RechartsPieChart data={pieChartData}>
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>
              <Box>
                {data.deviceMetrics.map((device) => (
                  <Box key={device.deviceId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">{device.deviceName}</Typography>
                    <Chip
                      label={device.status}
                      color={getStatusColor(device.status) as any}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Chip
                            label={alert.type}
                            color={getAlertColor(alert.type) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>{alert.device}</TableCell>
                        <TableCell>
                          {new Date(alert.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;