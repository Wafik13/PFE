import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Offline as OfflineIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Thermostat as ThermostatIcon,
  ElectricBolt as ElectricBoltIcon,
} from '@mui/icons-material';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  location: string;
  lastSeen: string;
  metrics?: {
    temperature?: number;
    pressure?: number;
    power?: number;
    efficiency?: number;
    uptime?: number;
  };
  alerts?: number;
  firmware?: string;
  ipAddress?: string;
}

interface DeviceStatusGridProps {
  devices?: Device[];
  onDeviceSelect?: (device: Device) => void;
  onDeviceUpdate?: (deviceId: string, updates: Partial<Device>) => void;
}

const DeviceStatusGrid: React.FC<DeviceStatusGridProps> = ({
  devices = [],
  onDeviceSelect,
  onDeviceUpdate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [mockDevices, setMockDevices] = useState<Device[]>([]);

  // Generate mock devices if none provided
  useEffect(() => {
    if (devices.length === 0) {
      const generateMockDevices = (): Device[] => {
        const deviceTypes = ['PLC', 'HMI', 'Sensor', 'Actuator', 'Gateway', 'Controller'];
        const locations = ['Plant A', 'Plant B', 'Warehouse', 'Office', 'Lab', 'Field'];
        const statuses: Device['status'][] = ['online', 'offline', 'warning', 'error'];
        
        return Array.from({ length: 12 }, (_, i) => {
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
          
          return {
            id: `device-${i + 1}`,
            name: `${type}-${String(i + 1).padStart(3, '0')}`,
            type,
            status,
            location: locations[Math.floor(Math.random() * locations.length)],
            lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            metrics: {
              temperature: 20 + Math.random() * 40,
              pressure: 10 + Math.random() * 20,
              power: Math.random() * 100,
              efficiency: 80 + Math.random() * 20,
              uptime: 95 + Math.random() * 5,
            },
            alerts: status === 'error' ? Math.floor(Math.random() * 5) + 1 : 
                   status === 'warning' ? Math.floor(Math.random() * 3) : 0,
            firmware: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          };
        });
      };
      
      setMockDevices(generateMockDevices());
    }
  }, [devices.length]);

  const displayDevices = devices.length > 0 ? devices : mockDevices;

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'offline':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'offline':
        return <OfflineIcon color="disabled" />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'plc':
      case 'controller':
        return <MemoryIcon />;
      case 'sensor':
        return <ThermostatIcon />;
      case 'actuator':
        return <ElectricBoltIcon />;
      case 'gateway':
        return <SettingsIcon />;
      default:
        return <SpeedIcon />;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, device: Device) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDevice(device);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDevice(null);
  };

  const handleDeviceClick = (device: Device) => {
    if (onDeviceSelect) {
      onDeviceSelect(device);
    }
  };

  const handleShowDetails = () => {
    setDetailsOpen(true);
    handleMenuClose();
  };

  const handleConfigure = () => {
    setConfigOpen(true);
    handleMenuClose();
  };

  const handleRefresh = () => {
    // Simulate device refresh
    if (selectedDevice && onDeviceUpdate) {
      onDeviceUpdate(selectedDevice.id, {
        lastSeen: new Date().toISOString(),
        status: Math.random() > 0.8 ? 'warning' : 'online',
      });
    }
    handleMenuClose();
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <>
      <Grid container spacing={2}>
        {displayDevices.map((device) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                border: device.status === 'error' ? '2px solid' : '1px solid',
                borderColor: device.status === 'error' ? 'error.main' : 'divider',
              }}
              onClick={() => handleDeviceClick(device)}
            >
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: `${getStatusColor(device.status)}.light`,
                        color: `${getStatusColor(device.status)}.main`,
                      }}
                    >
                      {getDeviceIcon(device.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {device.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {device.type}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, device)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip
                    icon={getStatusIcon(device.status)}
                    label={device.status.toUpperCase()}
                    color={getStatusColor(device.status) as any}
                    size="small"
                    variant="outlined"
                  />
                  {device.alerts && device.alerts > 0 && (
                    <Chip
                      label={`${device.alerts} alerts`}
                      color="error"
                      size="small"
                      variant="filled"
                    />
                  )}
                </Box>

                {/* Metrics */}
                {device.metrics && (
                  <Box sx={{ mb: 2 }}>
                    {device.metrics.temperature && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Temperature
                        </Typography>
                        <Typography variant="caption">
                          {device.metrics.temperature.toFixed(1)}°C
                        </Typography>
                      </Box>
                    )}
                    {device.metrics.efficiency && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Efficiency
                          </Typography>
                          <Typography variant="caption">
                            {device.metrics.efficiency.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={device.metrics.efficiency}
                          color={device.metrics.efficiency > 90 ? 'success' : device.metrics.efficiency > 70 ? 'warning' : 'error'}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {device.location}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatLastSeen(device.lastSeen)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleShowDetails}>
          <InfoIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleConfigure}>
          <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
          Configure
        </MenuItem>
        <MenuItem onClick={handleRefresh}>
          <RefreshIcon sx={{ mr: 1 }} fontSize="small" />
          Refresh Status
        </MenuItem>
      </Menu>

      {/* Device Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Device Details: {selectedDevice?.name}
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Basic Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2"><strong>ID:</strong> {selectedDevice.id}</Typography>
                  <Typography variant="body2"><strong>Type:</strong> {selectedDevice.type}</Typography>
                  <Typography variant="body2"><strong>Location:</strong> {selectedDevice.location}</Typography>
                  <Typography variant="body2"><strong>IP Address:</strong> {selectedDevice.ipAddress}</Typography>
                  <Typography variant="body2"><strong>Firmware:</strong> {selectedDevice.firmware}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Metrics</Typography>
                <Box sx={{ mb: 2 }}>
                  {selectedDevice.metrics && Object.entries(selectedDevice.metrics).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value?.toFixed(2)}
                      {key === 'temperature' ? '°C' : key.includes('percentage') || key === 'efficiency' || key === 'uptime' ? '%' : ''}
                    </Typography>
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure Device: {selectedDevice?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Device Name"
              defaultValue={selectedDevice?.name}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Location"
              defaultValue={selectedDevice?.location}
              margin="normal"
            />
            <TextField
              fullWidth
              label="IP Address"
              defaultValue={selectedDevice?.ipAddress}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Cancel</Button>
          <Button onClick={() => setConfigOpen(false)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeviceStatusGrid;