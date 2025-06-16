import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { io, Socket } from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DeviceManagement from './pages/DeviceManagement';
import Analytics from './pages/Analytics';
import MLModels from './pages/MLModels';
import Alarms from './pages/Alarms';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingSpinner from './components/LoadingSpinner';

// Services
import { AuthService } from './services/AuthService';
import { NotificationService } from './services/NotificationService';

// Types
import { User, AuthContextType } from './types/auth';
import { NotificationContextType } from './types/notifications';

// Context
export const AuthContext = React.createContext<AuthContextType | null>(null);
export const NotificationContext = React.createContext<NotificationContextType | null>(null);
export const SocketContext = React.createContext<Socket | null>(null);

// Theme configuration
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#0a0e27',
      paper: '#1e2139',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b3b8',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1e2139',
          border: '1px solid #2d3748',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Initialize authentication and socket connection
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for existing authentication
        const token = localStorage.getItem('auth_token');
        if (token) {
          const isValid = await AuthService.validateToken(token);
          if (isValid) {
            const userData = await AuthService.getCurrentUser();
            setUser(userData);
            
            // Initialize socket connection
            const socketConnection = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3005', {
              auth: {
                token: token
              }
            });
            
            socketConnection.on('connect', () => {
              console.log('Socket connected:', socketConnection.id);
            });
            
            socketConnection.on('disconnect', () => {
              console.log('Socket disconnected');
            });
            
            socketConnection.on('critical_alert', (alert) => {
              NotificationService.showCriticalAlert(alert);
              setNotifications(prev => [alert, ...prev.slice(0, 99)]); // Keep last 100 notifications
            });
            
            socketConnection.on('new_alarm', (alarm) => {
              NotificationService.showAlarm(alarm);
              setNotifications(prev => [alarm, ...prev.slice(0, 99)]);
            });
            
            setSocket(socketConnection);
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup socket connection on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await AuthService.login(username, password);
      if (response.success) {
        setUser(response.user);
        localStorage.setItem('auth_token', response.token);
        
        // Initialize socket connection after login
        const socketConnection = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3005', {
          auth: {
            token: response.token
          }
        });
        
        setSocket(socketConnection);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      localStorage.removeItem('auth_token');
      
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const authContextValue: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  const notificationContextValue: NotificationContextType = {
    notifications,
    addNotification: (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    },
    removeNotification: (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    },
    clearNotifications: () => {
      setNotifications([]);
    },
  };

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="background.default"
        >
          <LoadingSpinner size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthContext.Provider value={authContextValue}>
        <NotificationContext.Provider value={notificationContextValue}>
          <SocketContext.Provider value={socket}>
            <Router>
              {!user ? (
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              ) : (
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                  <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      bgcolor: 'background.default',
                      transition: 'margin-left 0.3s',
                      marginLeft: sidebarOpen ? '240px' : '60px',
                    }}
                  >
                    <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                    <Box sx={{ p: 3 }}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/devices" element={<DeviceManagement />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/ml-models" element={<MLModels />} />
                        <Route path="/alarms" element={<Alarms />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Box>
                  </Box>
                </Box>
              )}
            </Router>
          </SocketContext.Provider>
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;