import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  Network as NetworkIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  VolumeUp as VolumeUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Shield as ShieldIcon,
  Key as KeyIcon,
  History as HistoryIcon,
  Backup as BackupIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: Date;
  createdAt: Date;
}

interface SystemSettings {
  general: {
    siteName: string;
    timezone: string;
    language: string;
    theme: 'light' | 'dark' | 'auto';
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  notifications: {
    email: {
      enabled: boolean;
      smtpServer: string;
      smtpPort: number;
      username: string;
      password: string;
      encryption: 'none' | 'tls' | 'ssl';
    };
    sms: {
      enabled: boolean;
      provider: string;
      apiKey: string;
      fromNumber: string;
    };
    sound: {
      enabled: boolean;
      volume: number;
      criticalAlarmSound: string;
      warningAlarmSound: string;
    };
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      expirationDays: number;
    };
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    twoFactorAuth: boolean;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retention: number;
    location: string;
    encryption: boolean;
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'Industrial IoT Platform',
      timezone: 'UTC',
      language: 'en',
      theme: 'light',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h',
    },
    notifications: {
      email: {
        enabled: true,
        smtpServer: 'smtp.company.com',
        smtpPort: 587,
        username: 'notifications@company.com',
        password: '',
        encryption: 'tls',
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        apiKey: '',
        fromNumber: '',
      },
      sound: {
        enabled: true,
        volume: 80,
        criticalAlarmSound: 'critical.wav',
        warningAlarmSound: 'warning.wav',
      },
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expirationDays: 90,
      },
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      twoFactorAuth: false,
    },
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: 30,
      location: '/backup',
      encryption: true,
    },
  });

  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    role: 'operator',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, []);

  const loadUsers = async () => {
    try {
      // In a real app, this would fetch from API
      const mockUsers: User[] = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@company.com',
          role: 'administrator',
          status: 'active',
          lastLogin: new Date(),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          username: 'operator1',
          email: 'operator1@company.com',
          role: 'operator',
          status: 'active',
          lastLogin: new Date(Date.now() - 3600000),
          createdAt: new Date('2024-01-15'),
        },
        {
          id: '3',
          username: 'maintenance',
          email: 'maintenance@company.com',
          role: 'maintenance',
          status: 'active',
          lastLogin: new Date(Date.now() - 7200000),
          createdAt: new Date('2024-01-10'),
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // In a real app, this would fetch from API
      // Settings are already initialized with default values
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      // In a real app, this would save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully');
      setError('');
    } catch (error) {
      setError('Failed to save settings');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setUserFormData({
      username: '',
      email: '',
      role: 'operator',
      password: '',
      confirmPassword: '',
    });
    setIsEditingUser(false);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setUserFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    setSelectedUser(user);
    setIsEditingUser(true);
    setUserDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      try {
        setUsers(users.filter(u => u.id !== user.id));
        setSuccess('User deleted successfully');
        setError('');
      } catch (error) {
        setError('Failed to delete user');
      }
    }
  };

  const handleSaveUser = async () => {
    try {
      if (userFormData.password !== userFormData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (isEditingUser && selectedUser) {
        const updatedUser = {
          ...selectedUser,
          username: userFormData.username,
          email: userFormData.email,
          role: userFormData.role,
        };
        setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      } else {
        const newUser: User = {
          id: Date.now().toString(),
          username: userFormData.username,
          email: userFormData.email,
          role: userFormData.role,
          status: 'active',
          lastLogin: new Date(),
          createdAt: new Date(),
        };
        setUsers([...users, newUser]);
      }

      setUserDialogOpen(false);
      setSuccess(isEditingUser ? 'User updated successfully' : 'User created successfully');
      setError('');
    } catch (error) {
      setError('Failed to save user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'error';
      case 'supervisor': return 'warning';
      case 'operator': return 'primary';
      case 'maintenance': return 'info';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure system preferences, security, and user management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<PaletteIcon />} label="General" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<GroupIcon />} label="Users" />
          <Tab icon={<BackupIcon />} label="Backup" />
        </Tabs>
      </Box>

      {/* General Settings */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Site Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Site Name"
                      value={settings.general.siteName}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, siteName: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={settings.general.timezone}
                        label="Timezone"
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, timezone: e.target.value }
                        })}
                      >
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                        <MenuItem value="Europe/London">London</MenuItem>
                        <MenuItem value="Europe/Paris">Paris</MenuItem>
                        <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={settings.general.language}
                        label="Language"
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, language: e.target.value }
                        })}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="de">German</MenuItem>
                        <MenuItem value="zh">Chinese</MenuItem>
                        <MenuItem value="ja">Japanese</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Display Preferences
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={settings.general.theme}
                        label="Theme"
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, theme: e.target.value as any }
                        })}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="auto">Auto</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={settings.general.dateFormat}
                        label="Date Format"
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, dateFormat: e.target.value }
                        })}
                      >
                        <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                        <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Time Format</InputLabel>
                      <Select
                        value={settings.general.timeFormat}
                        label="Time Format"
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, timeFormat: e.target.value as any }
                        })}
                      >
                        <MenuItem value="12h">12 Hour</MenuItem>
                        <MenuItem value="24h">24 Hour</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Notification Settings */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmailIcon />
                  <Typography variant="h6">Email Notifications</Typography>
                  <Switch
                    checked={settings.notifications.email.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        email: { ...settings.notifications.email, enabled: e.target.checked }
                      }
                    })}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="SMTP Server"
                      value={settings.notifications.email.smtpServer}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: { ...settings.notifications.email, smtpServer: e.target.value }
                        }
                      })}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="SMTP Port"
                      value={settings.notifications.email.smtpPort}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: { ...settings.notifications.email, smtpPort: Number(e.target.value) }
                        }
                      })}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth disabled={!settings.notifications.email.enabled}>
                      <InputLabel>Encryption</InputLabel>
                      <Select
                        value={settings.notifications.email.encryption}
                        label="Encryption"
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            email: { ...settings.notifications.email, encryption: e.target.value as any }
                          }
                        })}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="tls">TLS</MenuItem>
                        <MenuItem value="ssl">SSL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={settings.notifications.email.username}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: { ...settings.notifications.email, username: e.target.value }
                        }
                      })}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password"
                      value={settings.notifications.email.password}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: { ...settings.notifications.email, password: e.target.value }
                        }
                      })}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SmsIcon />
                  <Typography variant="h6">SMS Notifications</Typography>
                  <Switch
                    checked={settings.notifications.sms.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        sms: { ...settings.notifications.sms, enabled: e.target.checked }
                      }
                    })}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth disabled={!settings.notifications.sms.enabled}>
                      <InputLabel>Provider</InputLabel>
                      <Select
                        value={settings.notifications.sms.provider}
                        label="Provider"
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            sms: { ...settings.notifications.sms, provider: e.target.value }
                          }
                        })}
                      >
                        <MenuItem value="twilio">Twilio</MenuItem>
                        <MenuItem value="aws_sns">AWS SNS</MenuItem>
                        <MenuItem value="nexmo">Nexmo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="API Key"
                      type="password"
                      value={settings.notifications.sms.apiKey}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          sms: { ...settings.notifications.sms, apiKey: e.target.value }
                        }
                      })}
                      disabled={!settings.notifications.sms.enabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="From Number"
                      value={settings.notifications.sms.fromNumber}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          sms: { ...settings.notifications.sms, fromNumber: e.target.value }
                        }
                      })}
                      disabled={!settings.notifications.sms.enabled}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VolumeUpIcon />
                  <Typography variant="h6">Sound Notifications</Typography>
                  <Switch
                    checked={settings.notifications.sound.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        sound: { ...settings.notifications.sound, enabled: e.target.checked }
                      }
                    })}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Volume: {settings.notifications.sound.volume}%</Typography>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.notifications.sound.volume}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          sound: { ...settings.notifications.sound, volume: Number(e.target.value) }
                        }
                      })}
                      disabled={!settings.notifications.sound.enabled}
                      style={{ width: '100%' }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Security Settings */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Password Policy
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Minimum Length"
                      value={settings.security.passwordPolicy.minLength}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            minLength: Number(e.target.value)
                          }
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.passwordPolicy.requireUppercase}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              passwordPolicy: {
                                ...settings.security.passwordPolicy,
                                requireUppercase: e.target.checked
                              }
                            }
                          })}
                        />
                      }
                      label="Require Uppercase Letters"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.passwordPolicy.requireNumbers}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              passwordPolicy: {
                                ...settings.security.passwordPolicy,
                                requireNumbers: e.target.checked
                              }
                            }
                          })}
                        />
                      }
                      label="Require Numbers"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.passwordPolicy.requireSpecialChars}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              passwordPolicy: {
                                ...settings.security.passwordPolicy,
                                requireSpecialChars: e.target.checked
                              }
                            }
                          })}
                        />
                      }
                      label="Require Special Characters"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Password Expiration (days)"
                      value={settings.security.passwordPolicy.expirationDays}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            expirationDays: Number(e.target.value)
                          }
                        }
                      })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session & Access Control
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Session Timeout (minutes)"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionTimeout: Number(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Login Attempts"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          maxLoginAttempts: Number(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Lockout Duration (minutes)"
                      value={settings.security.lockoutDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          lockoutDuration: Number(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              twoFactorAuth: e.target.checked
                            }
                          })}
                        />
                      }
                      label="Enable Two-Factor Authentication"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Management */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">User Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">{user.username}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={getStatusColor(user.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.lastLogin).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditUser(user)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteUser(user)}
                      disabled={user.id === '1'} // Prevent deleting admin
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Backup Settings */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Backup Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.backup.enabled}
                          onChange={(e) => setSettings({
                            ...settings,
                            backup: { ...settings.backup, enabled: e.target.checked }
                          })}
                        />
                      }
                      label="Enable Automatic Backups"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth disabled={!settings.backup.enabled}>
                      <InputLabel>Backup Frequency</InputLabel>
                      <Select
                        value={settings.backup.frequency}
                        label="Backup Frequency"
                        onChange={(e) => setSettings({
                          ...settings,
                          backup: { ...settings.backup, frequency: e.target.value as any }
                        })}
                      >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Retention Period (days)"
                      value={settings.backup.retention}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, retention: Number(e.target.value) }
                      })}
                      disabled={!settings.backup.enabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Backup Location"
                      value={settings.backup.location}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, location: e.target.value }
                      })}
                      disabled={!settings.backup.enabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.backup.encryption}
                          onChange={(e) => setSettings({
                            ...settings,
                            backup: { ...settings.backup, encryption: e.target.checked }
                          })}
                          disabled={!settings.backup.enabled}
                        />
                      }
                      label="Enable Backup Encryption"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Backup Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<BackupIcon />}
                    fullWidth
                  >
                    Create Manual Backup
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudSyncIcon />}
                    fullWidth
                  >
                    Restore from Backup
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    fullWidth
                  >
                    View Backup History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size={20} /> : 'Save Settings'}
        </Button>
      </Box>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userFormData.role}
                  label="Role"
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                >
                  <MenuItem value="administrator">Administrator</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {!isEditingUser && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    value={userFormData.confirmPassword}
                    onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {isEditingUser ? 'Update' : 'Create'} User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;