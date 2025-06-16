import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  DeviceHub,
  Memory,
  Speed,
  Thermostat,
  ElectricBolt,
  Settings,
} from '@mui/icons-material';
import { SCADAService } from '../services/SCADAService';
import LoadingSpinner from '../components/LoadingSpinner';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location: string;
  ipAddress: string;
  lastSeen: Date;
  firmware: string;
  model: string;
  manufacturer: string;
  tags: string[];
  metrics: {
    cpu: number;
    memory: number;
    temperature: number;
    power: number;
  };
  configuration: Record<string, any>;
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDevice, setMenuDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string>('');

  // Form state for device creation/editing
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    ipAddress: '',
    model: '',
    manufacturer: '',
    tags: '',
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await SCADAService.getDevices();
      if (response.success) {
        setDevices(response.devices || generateMockDevices());
      } else {
        setDevices(generateMockDevices());
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices(generateMockDevices());
    } finally {
      setLoading(false);
    }
  };

  const generateMockDevices = (): Device[] => {
    return [
      {
        id: '1',
        name: 'PLC-001',
        type: 'PLC',
        status: 'online',
        location: 'Production Line A',
        ipAddress: '192.168.1.100',
        lastSeen: new Date(),
        firmware: 'v2.1.3',
        model: 'S7-1500',
        manufacturer: 'Siemens',
        tags: ['critical', 'production'],
        metrics: { cpu: 45, memory: 67, temperature: 42, power: 85 },
        configuration: {},
      },
      {
        id: '2',
        name: 'HMI-002',
        type: 'HMI',
        status: 'online',
        location: 'Control Room',
        ipAddress: '192.168.1.101',
        lastSeen: new Date(Date.now() - 300000),
        firmware: 'v1.8.2',
        model: 'TP1200',
        manufacturer: 'Siemens',
        tags: ['interface'],
        metrics: { cpu: 23, memory: 34, temperature: 38, power: 92 },
        configuration: {},
      },
      {
        id: '3',
        name: 'SENSOR-003',
        type: 'Sensor',
        status: 'error',
        location: 'Tank Farm',
        ipAddress: '192.168.1.102',
        lastSeen: new Date(Date.now() - 3600000),
        firmware: 'v3.0.1',
        model: 'PT-100',
        manufacturer: 'Endress+Hauser',
        tags: ['temperature', 'monitoring'],
        metrics: { cpu: 0, memory: 0, temperature: 0, power: 0 },
        configuration: {},
      },
      {
        id: '4',
        name: 'DRIVE-004',
        type: 'VFD',
        status: 'maintenance',
        location: 'Motor Control Center',
        ipAddress: '192.168.1.103',
        lastSeen: new Date(Date.now() - 1800000),
        firmware: 'v4.2.0',
        model: 'G120C',
        manufacturer: 'Siemens',
        tags: ['motor', 'drive'],
        metrics: { cpu: 78, memory: 56, temperature: 65, power: 120 },
        configuration: {},
      },
    ];
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

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'PLC': return <DeviceHub />;
      case 'HMI': return <Memory />;
      case 'Sensor': return <Thermostat />;
      case 'VFD': return <ElectricBolt />;
      default: return <Settings />;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesType = filterType === 'all' || device.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, device: Device) => {
    setAnchorEl(event.currentTarget);
    setMenuDevice(device);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDevice(null);
  };

  const handleAddDevice = () => {
    setFormData({
      name: '',
      type: '',
      location: '',
      ipAddress: '',
      model: '',
      manufacturer: '',
      tags: '',
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditDevice = (device: Device) => {
    setFormData({
      name: device.name,
      type: device.type,
      location: device.location,
      ipAddress: device.ipAddress,
      model: device.model,
      manufacturer: device.manufacturer,
      tags: device.tags.join(', '),
    });
    setSelectedDevice(device);
    setIsEditing(true);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteDevice = async (device: Device) => {
    if (window.confirm(`Are you sure you want to delete ${device.name}?`)) {
      try {
        // In a real app, this would call the API
        setDevices(devices.filter(d => d.id !== device.id));
        setError('');
      } catch (error) {
        setError('Failed to delete device');
      }
    }
    handleMenuClose();
  };

  const handleSaveDevice = async () => {
    try {
      const deviceData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      if (isEditing && selectedDevice) {
        // Update existing device
        const updatedDevice = {
          ...selectedDevice,
          ...deviceData,
        };
        setDevices(devices.map(d => d.id === selectedDevice.id ? updatedDevice : d));
      } else {
        // Add new device
        const newDevice: Device = {
          id: Date.now().toString(),
          ...deviceData,
          status: 'offline' as const,
          lastSeen: new Date(),
          firmware: 'v1.0.0',
          metrics: { cpu: 0, memory: 0, temperature: 0, power: 0 },
          configuration: {},
        };
        setDevices([...devices, newDevice]);
      }

      setDialogOpen(false);
      setError('');
    } catch (error) {
      setError('Failed to save device');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LoadingSpinner message="Loading devices..." />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Device Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage all connected devices in your industrial network
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="PLC">PLC</MenuItem>
                  <MenuItem value="HMI">HMI</MenuItem>
                  <MenuItem value="Sensor">Sensor</MenuItem>
                  <MenuItem value="VFD">VFD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadDevices}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddDevice}
                >
                  Add Device
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Device Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell>Metrics</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(device.type)}
                      <Box>
                        <Typography variant="subtitle2">{device.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {device.manufacturer} {device.model}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={device.status}
                      color={getStatusColor(device.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{device.location}</TableCell>
                  <TableCell>{device.ipAddress}</TableCell>
                  <TableCell>
                    {new Date(device.lastSeen).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={`CPU: ${device.metrics.cpu}%`}>
                        <Chip label={`${device.metrics.cpu}%`} size="small" variant="outlined" />
                      </Tooltip>
                      <Tooltip title={`Temp: ${device.metrics.temperature}°C`}>
                        <Chip label={`${device.metrics.temperature}°C`} size="small" variant="outlined" />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, device)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuDevice && handleEditDevice(menuDevice)}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => menuDevice && handleDeleteDevice(menuDevice)}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Device Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Device' : 'Add New Device'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Device Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Device Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="PLC">PLC</MenuItem>
                  <MenuItem value="HMI">HMI</MenuItem>
                  <MenuItem value="Sensor">Sensor</MenuItem>
                  <MenuItem value="VFD">Variable Frequency Drive</MenuItem>
                  <MenuItem value="Gateway">Gateway</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="IP Address"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., critical, production, monitoring"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveDevice} variant="contained">
            {isEditing ? 'Update' : 'Add'} Device
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceManagement;