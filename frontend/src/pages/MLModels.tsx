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
  LinearProgress,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
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
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import { MLService } from '../services/MLService';

interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'anomaly_detection' | 'forecasting';
  status: 'training' | 'deployed' | 'stopped' | 'error' | 'ready';
  accuracy: number;
  version: string;
  createdAt: Date;
  lastTrained: Date;
  description: string;
  inputFeatures: string[];
  outputTarget: string;
  trainingData: {
    samples: number;
    features: number;
    lastUpdate: Date;
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  deployment: {
    endpoint: string;
    instances: number;
    cpuUsage: number;
    memoryUsage: number;
    requestsPerMinute: number;
  };
}

interface Prediction {
  id: string;
  modelId: string;
  input: Record<string, any>;
  output: any;
  confidence: number;
  timestamp: Date;
  executionTime: number;
}

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

const MLModels: React.FC = () => {
  const [models, setModels] = useState<MLModel[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuModel, setMenuModel] = useState<MLModel | null>(null);
  const [error, setError] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);
  const [predictionInput, setPredictionInput] = useState<Record<string, string>>({});

  // Form state for model creation/editing
  const [formData, setFormData] = useState({
    name: '',
    type: 'classification' as const,
    description: '',
    inputFeatures: '',
    outputTarget: '',
  });

  useEffect(() => {
    loadModels();
    loadPredictions();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await MLService.getModels();
      if (response.success) {
        setModels(response.models || generateMockModels());
      } else {
        setModels(generateMockModels());
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels(generateMockModels());
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const response = await MLService.getPredictions();
      if (response.success) {
        setPredictions(response.predictions || generateMockPredictions());
      } else {
        setPredictions(generateMockPredictions());
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
      setPredictions(generateMockPredictions());
    }
  };

  const generateMockModels = (): MLModel[] => {
    return [
      {
        id: '1',
        name: 'Equipment Failure Predictor',
        type: 'classification',
        status: 'deployed',
        accuracy: 94.5,
        version: 'v2.1.0',
        createdAt: new Date('2024-01-15'),
        lastTrained: new Date('2024-01-20'),
        description: 'Predicts equipment failure based on sensor data and maintenance history',
        inputFeatures: ['temperature', 'vibration', 'pressure', 'runtime_hours'],
        outputTarget: 'failure_probability',
        trainingData: {
          samples: 50000,
          features: 15,
          lastUpdate: new Date('2024-01-20'),
        },
        performance: {
          accuracy: 94.5,
          precision: 92.3,
          recall: 96.1,
          f1Score: 94.2,
        },
        deployment: {
          endpoint: '/api/ml/predict/equipment-failure',
          instances: 3,
          cpuUsage: 45,
          memoryUsage: 67,
          requestsPerMinute: 120,
        },
      },
      {
        id: '2',
        name: 'Energy Consumption Forecaster',
        type: 'forecasting',
        status: 'deployed',
        accuracy: 87.2,
        version: 'v1.3.2',
        createdAt: new Date('2024-01-10'),
        lastTrained: new Date('2024-01-18'),
        description: 'Forecasts energy consumption for the next 24 hours',
        inputFeatures: ['historical_consumption', 'weather_data', 'production_schedule'],
        outputTarget: 'energy_forecast',
        trainingData: {
          samples: 30000,
          features: 8,
          lastUpdate: new Date('2024-01-18'),
        },
        performance: {
          accuracy: 87.2,
          precision: 85.1,
          recall: 89.3,
          f1Score: 87.2,
        },
        deployment: {
          endpoint: '/api/ml/predict/energy-forecast',
          instances: 2,
          cpuUsage: 32,
          memoryUsage: 54,
          requestsPerMinute: 80,
        },
      },
      {
        id: '3',
        name: 'Anomaly Detection System',
        type: 'anomaly_detection',
        status: 'training',
        accuracy: 0,
        version: 'v1.0.0',
        createdAt: new Date('2024-01-22'),
        lastTrained: new Date('2024-01-22'),
        description: 'Detects anomalies in sensor readings and system behavior',
        inputFeatures: ['sensor_readings', 'system_metrics', 'operational_parameters'],
        outputTarget: 'anomaly_score',
        trainingData: {
          samples: 75000,
          features: 25,
          lastUpdate: new Date('2024-01-22'),
        },
        performance: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
        },
        deployment: {
          endpoint: '',
          instances: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          requestsPerMinute: 0,
        },
      },
    ];
  };

  const generateMockPredictions = (): Prediction[] => {
    return [
      {
        id: '1',
        modelId: '1',
        input: { temperature: 75.2, vibration: 0.8, pressure: 120.5, runtime_hours: 1250 },
        output: { failure_probability: 0.15, risk_level: 'low' },
        confidence: 0.94,
        timestamp: new Date(),
        executionTime: 45,
      },
      {
        id: '2',
        modelId: '2',
        input: { historical_consumption: 850, weather_temp: 22, production_level: 0.8 },
        output: { energy_forecast: [920, 880, 950, 1020] },
        confidence: 0.87,
        timestamp: new Date(Date.now() - 300000),
        executionTime: 120,
      },
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'success';
      case 'training': return 'info';
      case 'ready': return 'primary';
      case 'stopped': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'classification': return <AssessmentIcon />;
      case 'regression': return <TrendingUpIcon />;
      case 'anomaly_detection': return <WarningIcon />;
      case 'forecasting': return <ScheduleIcon />;
      default: return <PsychologyIcon />;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, model: MLModel) => {
    setAnchorEl(event.currentTarget);
    setMenuModel(model);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuModel(null);
  };

  const handleAddModel = () => {
    setFormData({
      name: '',
      type: 'classification',
      description: '',
      inputFeatures: '',
      outputTarget: '',
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditModel = (model: MLModel) => {
    setFormData({
      name: model.name,
      type: model.type,
      description: model.description,
      inputFeatures: model.inputFeatures.join(', '),
      outputTarget: model.outputTarget,
    });
    setSelectedModel(model);
    setIsEditing(true);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteModel = async (model: MLModel) => {
    if (window.confirm(`Are you sure you want to delete ${model.name}?`)) {
      try {
        setModels(models.filter(m => m.id !== model.id));
        setError('');
      } catch (error) {
        setError('Failed to delete model');
      }
    }
    handleMenuClose();
  };

  const handleDeployModel = async (model: MLModel) => {
    try {
      const updatedModel = { ...model, status: 'deployed' as const };
      setModels(models.map(m => m.id === model.id ? updatedModel : m));
      setError('');
    } catch (error) {
      setError('Failed to deploy model');
    }
    handleMenuClose();
  };

  const handleStopModel = async (model: MLModel) => {
    try {
      const updatedModel = { ...model, status: 'stopped' as const };
      setModels(models.map(m => m.id === model.id ? updatedModel : m));
      setError('');
    } catch (error) {
      setError('Failed to stop model');
    }
    handleMenuClose();
  };

  const handleSaveModel = async () => {
    try {
      const modelData = {
        ...formData,
        inputFeatures: formData.inputFeatures.split(',').map(f => f.trim()).filter(f => f),
      };

      if (isEditing && selectedModel) {
        const updatedModel = {
          ...selectedModel,
          ...modelData,
        };
        setModels(models.map(m => m.id === selectedModel.id ? updatedModel : m));
      } else {
        const newModel: MLModel = {
          id: Date.now().toString(),
          ...modelData,
          status: 'ready',
          accuracy: 0,
          version: 'v1.0.0',
          createdAt: new Date(),
          lastTrained: new Date(),
          trainingData: { samples: 0, features: 0, lastUpdate: new Date() },
          performance: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
          deployment: {
            endpoint: '',
            instances: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            requestsPerMinute: 0,
          },
        };
        setModels([...models, newModel]);
      }

      setDialogOpen(false);
      setError('');
    } catch (error) {
      setError('Failed to save model');
    }
  };

  const handlePredict = (model: MLModel) => {
    setSelectedModel(model);
    const inputFields: Record<string, string> = {};
    model.inputFeatures.forEach(feature => {
      inputFields[feature] = '';
    });
    setPredictionInput(inputFields);
    setPredictionDialogOpen(true);
    handleMenuClose();
  };

  const handleRunPrediction = async () => {
    if (!selectedModel) return;

    try {
      const input = Object.fromEntries(
        Object.entries(predictionInput).map(([key, value]) => [
          key,
          isNaN(Number(value)) ? value : Number(value)
        ])
      );

      const newPrediction: Prediction = {
        id: Date.now().toString(),
        modelId: selectedModel.id,
        input,
        output: { result: 'Sample prediction result' },
        confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
        timestamp: new Date(),
        executionTime: Math.floor(Math.random() * 100) + 20,
      };

      setPredictions([newPrediction, ...predictions]);
      setPredictionDialogOpen(false);
      setError('');
    } catch (error) {
      setError('Failed to run prediction');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LoadingSpinner message="Loading ML models..." />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Machine Learning Models
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and deploy machine learning models for predictive analytics
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Models" />
          <Tab label="Predictions" />
          <Tab label="Performance" />
        </Tabs>
      </Box>

      {/* Models Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadModels}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddModel}
          >
            Add Model
          </Button>
        </Box>

        <Grid container spacing={3}>
          {models.map((model) => (
            <Grid item xs={12} md={6} lg={4} key={model.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(model.type)}
                      <Typography variant="h6">{model.name}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, model)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Chip
                    label={model.status}
                    color={getStatusColor(model.status) as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {model.description}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Type: {model.type.replace('_', ' ')}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Version: {model.version}
                    </Typography>
                    <br />
                    {model.accuracy > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Accuracy: {model.accuracy.toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                  
                  {model.status === 'training' && (
                    <LinearProgress sx={{ mb: 2 }} />
                  )}
                  
                  {model.status === 'deployed' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Requests/min: {model.deployment.requestsPerMinute}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        CPU: {model.deployment.cpuUsage}% | Memory: {model.deployment.memoryUsage}%
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Predictions Tab */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell>Input</TableCell>
                <TableCell>Output</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Execution Time</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map((prediction) => {
                const model = models.find(m => m.id === prediction.modelId);
                return (
                  <TableRow key={prediction.id}>
                    <TableCell>{model?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {JSON.stringify(prediction.input, null, 2).substring(0, 100)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {JSON.stringify(prediction.output, null, 2).substring(0, 100)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${(prediction.confidence * 100).toFixed(1)}%`}
                        color={prediction.confidence > 0.8 ? 'success' : prediction.confidence > 0.6 ? 'warning' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{prediction.executionTime}ms</TableCell>
                    <TableCell>
                      {new Date(prediction.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {models.filter(m => m.accuracy > 0).map((model) => (
            <Grid item xs={12} md={6} key={model.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {model.name} Performance
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Accuracy
                      </Typography>
                      <Typography variant="h6">
                        {model.performance.accuracy.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Precision
                      </Typography>
                      <Typography variant="h6">
                        {model.performance.precision.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Recall
                      </Typography>
                      <Typography variant="h6">
                        {model.performance.recall.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        F1 Score
                      </Typography>
                      <Typography variant="h6">
                        {model.performance.f1Score.toFixed(1)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuModel?.status === 'ready' && (
          <MenuItem onClick={() => menuModel && handleDeployModel(menuModel)}>
            <PlayIcon sx={{ mr: 1 }} /> Deploy
          </MenuItem>
        )}
        {menuModel?.status === 'deployed' && [
          <MenuItem key="predict" onClick={() => menuModel && handlePredict(menuModel)}>
            <AssessmentIcon sx={{ mr: 1 }} /> Predict
          </MenuItem>,
          <MenuItem key="stop" onClick={() => menuModel && handleStopModel(menuModel)}>
            <StopIcon sx={{ mr: 1 }} /> Stop
          </MenuItem>
        ]}
        <MenuItem onClick={() => menuModel && handleEditModel(menuModel)}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => menuModel && handleDeleteModel(menuModel)}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Model Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Model' : 'Add New Model'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Model Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Model Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Model Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="classification">Classification</MenuItem>
                  <MenuItem value="regression">Regression</MenuItem>
                  <MenuItem value="anomaly_detection">Anomaly Detection</MenuItem>
                  <MenuItem value="forecasting">Forecasting</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Input Features (comma separated)"
                value={formData.inputFeatures}
                onChange={(e) => setFormData({ ...formData, inputFeatures: e.target.value })}
                placeholder="e.g., temperature, pressure, vibration"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Output Target"
                value={formData.outputTarget}
                onChange={(e) => setFormData({ ...formData, outputTarget: e.target.value })}
                placeholder="e.g., failure_probability"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveModel} variant="contained">
            {isEditing ? 'Update' : 'Create'} Model
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prediction Dialog */}
      <Dialog open={predictionDialogOpen} onClose={() => setPredictionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Run Prediction - {selectedModel?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedModel?.inputFeatures.map((feature) => (
              <Grid item xs={12} key={feature}>
                <TextField
                  fullWidth
                  label={feature.replace('_', ' ').toUpperCase()}
                  value={predictionInput[feature] || ''}
                  onChange={(e) => setPredictionInput({
                    ...predictionInput,
                    [feature]: e.target.value
                  })}
                  type="number"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPredictionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRunPrediction} variant="contained">
            Run Prediction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MLModels;