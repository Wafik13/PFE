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
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  ExpandMore as ExpandMoreIcon,
  Acknowledge as AcknowledgeIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Cell,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import { SCADAService } from '../services/SCADAService';

interface Alarm {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'cleared' | 'suppressed';
  source: string;
  category: string;
  condition: string;
  threshold: {
    value: number;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
    unit: string;
  };
  currentValue: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  clearedAt?: Date;
  count: number;
  isEnabled: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    sound: boolean;
    popup: boolean;
  };
  escalation: {
    enabled: boolean;
    delay: number; // minutes
    recipients: string[];
  };
}

interface AlarmRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  isEnabled: boolean;
  source: string;
  category: string;
  threshold: {
    value: number;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
    unit: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    sound: boolean;
    popup: boolean;
  };
  escalation: {
    enabled: boolean;
    delay: number;
    recipients: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const Alarms: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlarmRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<Alarm | AlarmRule | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'alarms' | 'rules'>('alarms');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Form state for alarm rule creation/editing
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    description: '',
    condition: '',
    severity: 'medium' as const,
    source: '',
    category: '',
    thresholdValue: 0,
    thresholdOperator: '>' as const,
    thresholdUnit: '',
    emailNotification: true,
    smsNotification: false,
    soundNotification: true,
    popupNotification: true,
    escalationEnabled: false,
    escalationDelay: 30,
    escalationRecipients: '',
  });

  useEffect(() => {
    loadAlarms();
    loadAlarmRules();
  }, []);

  const loadAlarms = async () => {
    try {
      setLoading(true);
      const response = await SCADAService.getAlarms();
      if (response.success) {
        setAlarms(response.alarms || generateMockAlarms());
      } else {
        setAlarms(generateMockAlarms());
      }
    } catch (error) {
      console.error('Failed to load alarms:', error);
      setAlarms(generateMockAlarms());
    } finally {
      setLoading(false);
    }
  };

  const loadAlarmRules = async () => {
    try {
      const response = await SCADAService.getAlarmRules();
      if (response.success) {
        setAlarmRules(response.rules || generateMockAlarmRules());
      } else {
        setAlarmRules(generateMockAlarmRules());
      }
    } catch (error) {
      console.error('Failed to load alarm rules:', error);
      setAlarmRules(generateMockAlarmRules());
    }
  };

  const generateMockAlarms = (): Alarm[] => {
    return [
      {
        id: '1',
        name: 'High Temperature Alert',
        description: 'Temperature sensor reading exceeds safe operating limits',
        severity: 'critical',
        status: 'active',
        source: 'SENSOR-003',
        category: 'Temperature',
        condition: 'temperature > 80°C',
        threshold: { value: 80, operator: '>', unit: '°C' },
        currentValue: 85.2,
        triggeredAt: new Date(Date.now() - 1800000),
        count: 1,
        isEnabled: true,
        notifications: { email: true, sms: true, sound: true, popup: true },
        escalation: { enabled: true, delay: 15, recipients: ['supervisor@company.com'] },
      },
      {
        id: '2',
        name: 'Low Pressure Warning',
        description: 'System pressure below minimum threshold',
        severity: 'high',
        status: 'acknowledged',
        source: 'PLC-001',
        category: 'Pressure',
        condition: 'pressure < 100 PSI',
        threshold: { value: 100, operator: '<', unit: 'PSI' },
        currentValue: 95.5,
        triggeredAt: new Date(Date.now() - 3600000),
        acknowledgedAt: new Date(Date.now() - 1800000),
        acknowledgedBy: 'operator1',
        count: 3,
        isEnabled: true,
        notifications: { email: true, sms: false, sound: true, popup: true },
        escalation: { enabled: false, delay: 30, recipients: [] },
      },
      {
        id: '3',
        name: 'Communication Lost',
        description: 'Lost communication with remote device',
        severity: 'medium',
        status: 'cleared',
        source: 'HMI-002',
        category: 'Communication',
        condition: 'device_status = offline',
        threshold: { value: 1, operator: '=', unit: '' },
        currentValue: 0,
        triggeredAt: new Date(Date.now() - 7200000),
        clearedAt: new Date(Date.now() - 3600000),
        count: 1,
        isEnabled: true,
        notifications: { email: true, sms: false, sound: false, popup: true },
        escalation: { enabled: false, delay: 60, recipients: [] },
      },
      {
        id: '4',
        name: 'Motor Vibration High',
        description: 'Motor vibration levels indicate potential bearing failure',
        severity: 'high',
        status: 'active',
        source: 'DRIVE-004',
        category: 'Vibration',
        condition: 'vibration > 5.0 mm/s',
        threshold: { value: 5.0, operator: '>', unit: 'mm/s' },
        currentValue: 6.2,
        triggeredAt: new Date(Date.now() - 900000),
        count: 2,
        isEnabled: true,
        notifications: { email: true, sms: true, sound: true, popup: true },
        escalation: { enabled: true, delay: 30, recipients: ['maintenance@company.com'] },
      },
    ];
  };

  const generateMockAlarmRules = (): AlarmRule[] => {
    return [
      {
        id: '1',
        name: 'Temperature Monitoring',
        description: 'Monitor temperature sensors for overheating',
        condition: 'temperature > threshold',
        severity: 'critical',
        isEnabled: true,
        source: 'Temperature Sensors',
        category: 'Temperature',
        threshold: { value: 80, operator: '>', unit: '°C' },
        notifications: { email: true, sms: true, sound: true, popup: true },
        escalation: { enabled: true, delay: 15, recipients: ['supervisor@company.com'] },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: 'Pressure Monitoring',
        description: 'Monitor system pressure levels',
        condition: 'pressure < threshold OR pressure > max_threshold',
        severity: 'high',
        isEnabled: true,
        source: 'Pressure Sensors',
        category: 'Pressure',
        threshold: { value: 100, operator: '<', unit: 'PSI' },
        notifications: { email: true, sms: false, sound: true, popup: true },
        escalation: { enabled: false, delay: 30, recipients: [] },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
      },
    ];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'error';
      case 'acknowledged': return 'warning';
      case 'cleared': return 'success';
      case 'suppressed': return 'default';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <CheckCircleIcon />;
      case 'info': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const filteredAlarms = alarms.filter(alarm => {
    const matchesSearch = alarm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alarm.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alarm.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || alarm.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alarm.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeAlarmsCount = alarms.filter(a => a.status === 'active').length;
  const acknowledgedAlarmsCount = alarms.filter(a => a.status === 'acknowledged').length;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: Alarm | AlarmRule) => {
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const handleAcknowledgeAlarm = async (alarm: Alarm) => {
    try {
      const updatedAlarm = {
        ...alarm,
        status: 'acknowledged' as const,
        acknowledgedAt: new Date(),
        acknowledgedBy: 'current_user',
      };
      setAlarms(alarms.map(a => a.id === alarm.id ? updatedAlarm : a));
      setError('');
    } catch (error) {
      setError('Failed to acknowledge alarm');
    }
    handleMenuClose();
  };

  const handleClearAlarm = async (alarm: Alarm) => {
    try {
      const updatedAlarm = {
        ...alarm,
        status: 'cleared' as const,
        clearedAt: new Date(),
      };
      setAlarms(alarms.map(a => a.id === alarm.id ? updatedAlarm : a));
      setError('');
    } catch (error) {
      setError('Failed to clear alarm');
    }
    handleMenuClose();
  };

  const handleAddRule = () => {
    setRuleFormData({
      name: '',
      description: '',
      condition: '',
      severity: 'medium',
      source: '',
      category: '',
      thresholdValue: 0,
      thresholdOperator: '>',
      thresholdUnit: '',
      emailNotification: true,
      smsNotification: false,
      soundNotification: true,
      popupNotification: true,
      escalationEnabled: false,
      escalationDelay: 30,
      escalationRecipients: '',
    });
    setIsEditing(false);
    setRuleDialogOpen(true);
  };

  const handleEditRule = (rule: AlarmRule) => {
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      severity: rule.severity,
      source: rule.source,
      category: rule.category,
      thresholdValue: rule.threshold.value,
      thresholdOperator: rule.threshold.operator,
      thresholdUnit: rule.threshold.unit,
      emailNotification: rule.notifications.email,
      smsNotification: rule.notifications.sms,
      soundNotification: rule.notifications.sound,
      popupNotification: rule.notifications.popup,
      escalationEnabled: rule.escalation.enabled,
      escalationDelay: rule.escalation.delay,
      escalationRecipients: rule.escalation.recipients.join(', '),
    });
    setSelectedRule(rule);
    setIsEditing(true);
    setRuleDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteRule = async (rule: AlarmRule) => {
    if (window.confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      try {
        setAlarmRules(alarmRules.filter(r => r.id !== rule.id));
        setError('');
      } catch (error) {
        setError('Failed to delete alarm rule');
      }
    }
    handleMenuClose();
  };

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        name: ruleFormData.name,
        description: ruleFormData.description,
        condition: ruleFormData.condition,
        severity: ruleFormData.severity,
        isEnabled: true,
        source: ruleFormData.source,
        category: ruleFormData.category,
        threshold: {
          value: ruleFormData.thresholdValue,
          operator: ruleFormData.thresholdOperator,
          unit: ruleFormData.thresholdUnit,
        },
        notifications: {
          email: ruleFormData.emailNotification,
          sms: ruleFormData.smsNotification,
          sound: ruleFormData.soundNotification,
          popup: ruleFormData.popupNotification,
        },
        escalation: {
          enabled: ruleFormData.escalationEnabled,
          delay: ruleFormData.escalationDelay,
          recipients: ruleFormData.escalationRecipients.split(',').map(r => r.trim()).filter(r => r),
        },
      };

      if (isEditing && selectedRule) {
        const updatedRule = {
          ...selectedRule,
          ...ruleData,
          updatedAt: new Date(),
        };
        setAlarmRules(alarmRules.map(r => r.id === selectedRule.id ? updatedRule : r));
      } else {
        const newRule: AlarmRule = {
          id: Date.now().toString(),
          ...ruleData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setAlarmRules([...alarmRules, newRule]);
      }

      setRuleDialogOpen(false);
      setError('');
    } catch (error) {
      setError('Failed to save alarm rule');
    }
  };

  const alarmStats = {
    total: alarms.length,
    active: activeAlarmsCount,
    acknowledged: acknowledgedAlarmsCount,
    cleared: alarms.filter(a => a.status === 'cleared').length,
  };

  const severityStats = [
    { name: 'Critical', value: alarms.filter(a => a.severity === 'critical').length, color: '#f44336' },
    { name: 'High', value: alarms.filter(a => a.severity === 'high').length, color: '#ff9800' },
    { name: 'Medium', value: alarms.filter(a => a.severity === 'medium').length, color: '#2196f3' },
    { name: 'Low', value: alarms.filter(a => a.severity === 'low').length, color: '#4caf50' },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LoadingSpinner message="Loading alarms..." />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Alarm Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor and manage system alarms and notifications
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge badgeContent={activeAlarmsCount} color="error">
              <NotificationsActiveIcon />
            </Badge>
            <IconButton
              color={soundEnabled ? 'primary' : 'default'}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon color="error" />
                <Typography variant="h6">Active</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {alarmStats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AcknowledgeIcon color="warning" />
                <Typography variant="h6">Acknowledged</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {alarmStats.acknowledged}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Being handled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">Cleared</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {alarmStats.cleared}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resolved today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Total</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {alarmStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All alarms
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={activeTab === 'alarms' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('alarms')}
          sx={{ mr: 1 }}
        >
          Active Alarms
        </Button>
        <Button
          variant={activeTab === 'rules' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('rules')}
        >
          Alarm Rules
        </Button>
      </Box>

      {activeTab === 'alarms' && (
        <>
          {/* Controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Search alarms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={filterSeverity}
                      label="Severity"
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <MenuItem value="all">All Severities</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                    </Select>
                  </FormControl>
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
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="acknowledged">Acknowledged</MenuItem>
                      <MenuItem value="cleared">Cleared</MenuItem>
                      <MenuItem value="suppressed">Suppressed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={loadAlarms}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Alarms Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Alarm</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Current Value</TableCell>
                    <TableCell>Triggered</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlarms.map((alarm) => (
                    <TableRow key={alarm.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSeverityIcon(alarm.severity)}
                          <Chip
                            label={alarm.severity}
                            color={getSeverityColor(alarm.severity) as any}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{alarm.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alarm.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{alarm.source}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alarm.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alarm.status}
                          color={getStatusColor(alarm.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alarm.currentValue} {alarm.threshold.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Threshold: {alarm.threshold.operator} {alarm.threshold.value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(alarm.triggeredAt).toLocaleString()}
                        </Typography>
                        {alarm.acknowledgedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Ack: {new Date(alarm.acknowledgedAt).toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={alarm.count} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, alarm)}
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
        </>
      )}

      {activeTab === 'rules' && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAlarmRules}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRule}
            >
              Add Rule
            </Button>
          </Box>

          <Grid container spacing={3}>
            {alarmRules.map((rule) => (
              <Grid item xs={12} md={6} key={rule.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSeverityIcon(rule.severity)}
                        <Typography variant="h6">{rule.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch checked={rule.isEnabled} size="small" />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, rule)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Chip
                      label={rule.severity}
                      color={getSeverityColor(rule.severity) as any}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {rule.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Condition: {rule.condition}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Source: {rule.source}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Category: {rule.category}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {rule.notifications.email && <EmailIcon fontSize="small" color="primary" />}
                      {rule.notifications.sms && <SmsIcon fontSize="small" color="primary" />}
                      {rule.notifications.sound && <VolumeUpIcon fontSize="small" color="primary" />}
                      {rule.escalation.enabled && <ScheduleIcon fontSize="small" color="warning" />}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuItem && 'status' in menuItem && (
          [
            menuItem.status === 'active' && (
              <MenuItem key="acknowledge" onClick={() => handleAcknowledgeAlarm(menuItem as Alarm)}>
                <AcknowledgeIcon sx={{ mr: 1 }} /> Acknowledge
              </MenuItem>
            ),
            (menuItem.status === 'active' || menuItem.status === 'acknowledged') && (
              <MenuItem key="clear" onClick={() => handleClearAlarm(menuItem as Alarm)}>
                <ClearIcon sx={{ mr: 1 }} /> Clear
              </MenuItem>
            ),
          ]
        )}
        {menuItem && 'createdAt' in menuItem && (
          [
            <MenuItem key="edit" onClick={() => handleEditRule(menuItem as AlarmRule)}>
              <EditIcon sx={{ mr: 1 }} /> Edit
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleDeleteRule(menuItem as AlarmRule)}>
              <DeleteIcon sx={{ mr: 1 }} /> Delete
            </MenuItem>,
          ]
        )}
      </Menu>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Alarm Rule' : 'Add New Alarm Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Rule Name"
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={ruleFormData.severity}
                  label="Severity"
                  onChange={(e) => setRuleFormData({ ...ruleFormData, severity: e.target.value as any })}
                >
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={ruleFormData.description}
                onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Source"
                value={ruleFormData.source}
                onChange={(e) => setRuleFormData({ ...ruleFormData, source: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Category"
                value={ruleFormData.category}
                onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Condition"
                value={ruleFormData.condition}
                onChange={(e) => setRuleFormData({ ...ruleFormData, condition: e.target.value })}
                placeholder="e.g., temperature > 80"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Threshold Value"
                value={ruleFormData.thresholdValue}
                onChange={(e) => setRuleFormData({ ...ruleFormData, thresholdValue: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={ruleFormData.thresholdOperator}
                  label="Operator"
                  onChange={(e) => setRuleFormData({ ...ruleFormData, thresholdOperator: e.target.value as any })}
                >
                  <MenuItem value=">">Greater than (&gt;)</MenuItem>
                  <MenuItem value="<">Less than (&lt;)</MenuItem>
                  <MenuItem value=">=">Greater or equal (&gt;=)</MenuItem>
                  <MenuItem value="<=">Less or equal (&lt;=)</MenuItem>
                  <MenuItem value="=">Equal (=)</MenuItem>
                  <MenuItem value="!=">Not equal (!=)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Unit"
                value={ruleFormData.thresholdUnit}
                onChange={(e) => setRuleFormData({ ...ruleFormData, thresholdUnit: e.target.value })}
                placeholder="e.g., °C, PSI, %"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Notifications
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleFormData.emailNotification}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, emailNotification: e.target.checked })}
                    />
                  }
                  label="Email"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleFormData.smsNotification}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, smsNotification: e.target.checked })}
                    />
                  }
                  label="SMS"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleFormData.soundNotification}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, soundNotification: e.target.checked })}
                    />
                  }
                  label="Sound"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleFormData.popupNotification}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, popupNotification: e.target.checked })}
                    />
                  }
                  label="Popup"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleFormData.escalationEnabled}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, escalationEnabled: e.target.checked })}
                  />
                }
                label="Enable Escalation"
              />
            </Grid>
            
            {ruleFormData.escalationEnabled && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Escalation Delay (minutes)"
                    value={ruleFormData.escalationDelay}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, escalationDelay: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Escalation Recipients (comma separated)"
                    value={ruleFormData.escalationRecipients}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, escalationRecipients: e.target.value })}
                    placeholder="email1@company.com, email2@company.com"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {isEditing ? 'Update' : 'Create'} Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Alarms;