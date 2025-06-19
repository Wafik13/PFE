import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

interface Alarm {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  deviceId?: string;
  deviceName?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  category: string;
  source: string;
}

interface AlarmPanelProps {
  alarms?: Alarm[];
  onAcknowledge?: (alarmId: string, note?: string) => void;
  onResolve?: (alarmId: string, note?: string) => void;
  onRefresh?: () => void;
  maxHeight?: number;
}

const AlarmPanel: React.FC<AlarmPanelProps> = ({
  alarms = [],
  onAcknowledge,
  onResolve,
  onRefresh,
  maxHeight = 400,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [acknowledgeOpen, setAcknowledgeOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [mockAlarms, setMockAlarms] = useState<Alarm[]>([]);
  const [note, setNote] = useState('');

  // Generate mock alarms if none provided
  useEffect(() => {
    if (alarms.length === 0) {
      const generateMockAlarms = (): Alarm[] => {
        const severities: Alarm['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
        const categories = ['System', 'Network', 'Hardware', 'Security', 'Performance'];
        const sources = ['PLC-001', 'HMI-002', 'Sensor-003', 'Gateway-004', 'Controller-005'];
        const messages = [
          'Temperature threshold exceeded',
          'Communication timeout detected',
          'Memory usage critical',
          'Unauthorized access attempt',
          'Device offline for extended period',
          'Pressure sensor malfunction',
          'Network latency high',
          'Backup system activated',
          'Configuration change detected',
          'Maintenance window approaching',
        ];

        return Array.from({ length: 15 }, (_, i) => {
          const severity = severities[Math.floor(Math.random() * severities.length)];
          const category = categories[Math.floor(Math.random() * categories.length)];
          const source = sources[Math.floor(Math.random() * sources.length)];
          const message = messages[Math.floor(Math.random() * messages.length)];
          const acknowledged = Math.random() > 0.7;
          const resolved = acknowledged && Math.random() > 0.6;
          
          return {
            id: `alarm-${i + 1}`,
            severity,
            title: `${category} Alert`,
            message,
            deviceId: source,
            deviceName: source,
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            acknowledged,
            acknowledgedBy: acknowledged ? 'operator@company.com' : undefined,
            acknowledgedAt: acknowledged ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
            resolved,
            resolvedAt: resolved ? new Date(Date.now() - Math.random() * 1800000).toISOString() : undefined,
            category,
            source,
          };
        });
      };
      
      setMockAlarms(generateMockAlarms());
    }
  }, [alarms.length]);

  const displayAlarms = alarms.length > 0 ? alarms : mockAlarms;

  const getSeverityColor = (severity: Alarm['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: Alarm['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ErrorIcon />;
      case 'medium':
        return <WarningIcon />;
      case 'low':
      case 'info':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const filterAlarms = (alarms: Alarm[]) => {
    let filtered = alarms;
    
    // Filter by tab
    switch (tabValue) {
      case 0: // Active
        filtered = filtered.filter(alarm => !alarm.resolved);
        break;
      case 1: // Acknowledged
        filtered = filtered.filter(alarm => alarm.acknowledged && !alarm.resolved);
        break;
      case 2: // Resolved
        filtered = filtered.filter(alarm => alarm.resolved);
        break;
    }
    
    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alarm => alarm.severity === filterSeverity);
    }
    
    return filtered.sort((a, b) => {
      // Sort by severity first, then by timestamp
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  const filteredAlarms = filterAlarms(displayAlarms);
  
  const getAlarmCounts = () => {
    return {
      active: displayAlarms.filter(alarm => !alarm.resolved).length,
      acknowledged: displayAlarms.filter(alarm => alarm.acknowledged && !alarm.resolved).length,
      resolved: displayAlarms.filter(alarm => alarm.resolved).length,
    };
  };

  const counts = getAlarmCounts();

  const handleAcknowledge = (alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setAcknowledgeOpen(true);
  };

  const handleResolve = (alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setResolveOpen(true);
  };

  const handleAcknowledgeConfirm = () => {
    if (selectedAlarm && onAcknowledge) {
      onAcknowledge(selectedAlarm.id, note);
    }
    setAcknowledgeOpen(false);
    setNote('');
    setSelectedAlarm(null);
  };

  const handleResolveConfirm = () => {
    if (selectedAlarm && onResolve) {
      onResolve(selectedAlarm.id, note);
    }
    setResolveOpen(false);
    setNote('');
    setSelectedAlarm(null);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeAgo = (timestamp: string) => {
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
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon />
              Alarm Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filterSeverity}
                  label="Severity"
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Refresh Alarms">
                <IconButton onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab 
              label={
                <Badge badgeContent={counts.active} color="error">
                  Active
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.acknowledged} color="warning">
                  Acknowledged
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.resolved} color="success">
                  Resolved
                </Badge>
              } 
            />
          </Tabs>

          {/* Critical Alert Banner */}
          {displayAlarms.filter(alarm => alarm.severity === 'critical' && !alarm.resolved).length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                {displayAlarms.filter(alarm => alarm.severity === 'critical' && !alarm.resolved).length} critical alarms require immediate attention!
              </Typography>
            </Alert>
          )}

          {/* Alarm List */}
          <Box sx={{ maxHeight, overflow: 'auto' }}>
            {filteredAlarms.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <NotificationsOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No alarms in this category
                </Typography>
              </Box>
            ) : (
              <List>
                {filteredAlarms.map((alarm, index) => (
                  <React.Fragment key={alarm.id}>
                    <ListItem
                      sx={{
                        border: alarm.severity === 'critical' ? '1px solid' : 'none',
                        borderColor: 'error.main',
                        borderRadius: alarm.severity === 'critical' ? 1 : 0,
                        mb: alarm.severity === 'critical' ? 1 : 0,
                        bgcolor: alarm.severity === 'critical' ? 'error.light' : 'transparent',
                        opacity: alarm.resolved ? 0.6 : 1,
                      }}
                    >
                      <ListItemIcon>
                        {getSeverityIcon(alarm.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2">{alarm.title}</Typography>
                            <Chip
                              label={alarm.severity.toUpperCase()}
                              color={getSeverityColor(alarm.severity) as any}
                              size="small"
                            />
                            {alarm.acknowledged && (
                              <Chip
                                label="ACK"
                                color="warning"
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {alarm.resolved && (
                              <Chip
                                label="RESOLVED"
                                color="success"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {alarm.message}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {alarm.deviceName} • {getTimeAgo(alarm.timestamp)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {alarm.category}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {!alarm.acknowledged && (
                            <Tooltip title="Acknowledge">
                              <IconButton
                                size="small"
                                onClick={() => handleAcknowledge(alarm)}
                                color="warning"
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {alarm.acknowledged && !alarm.resolved && (
                            <Tooltip title="Resolve">
                              <IconButton
                                size="small"
                                onClick={() => handleResolve(alarm)}
                                color="success"
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedAlarm(alarm);
                                setDetailsOpen(true);
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < filteredAlarms.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Alarm Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Alarm Details</DialogTitle>
        <DialogContent>
          {selectedAlarm && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>{selectedAlarm.title}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedAlarm.message}</Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip label={selectedAlarm.severity.toUpperCase()} color={getSeverityColor(selectedAlarm.severity) as any} />
                </Box>
                <Box>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography variant="body2">{selectedAlarm.category}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Source Device</Typography>
                  <Typography variant="body2">{selectedAlarm.deviceName}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Timestamp</Typography>
                  <Typography variant="body2">{formatTimestamp(selectedAlarm.timestamp)}</Typography>
                </Box>
              </Box>
              
              {selectedAlarm.acknowledged && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Acknowledged</Typography>
                  <Typography variant="body2">
                    By {selectedAlarm.acknowledgedBy} at {formatTimestamp(selectedAlarm.acknowledgedAt!)}
                  </Typography>
                </Box>
              )}
              
              {selectedAlarm.resolved && (
                <Box>
                  <Typography variant="subtitle2">Resolved</Typography>
                  <Typography variant="body2">
                    At {formatTimestamp(selectedAlarm.resolvedAt!)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Acknowledge Dialog */}
      <Dialog open={acknowledgeOpen} onClose={() => setAcknowledgeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Acknowledge Alarm</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to acknowledge this alarm?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this acknowledgment..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcknowledgeOpen(false)}>Cancel</Button>
          <Button onClick={handleAcknowledgeConfirm} variant="contained" color="warning">
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Alarm</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to resolve this alarm?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Resolution Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe how this alarm was resolved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>Cancel</Button>
          <Button onClick={handleResolveConfirm} variant="contained" color="success">
            Resolve
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlarmPanel;