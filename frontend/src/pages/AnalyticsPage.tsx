import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { machinesApi } from '../api/machines';
import { alertsApi } from '../api/alerts';
import { Machine, Alarm, MLAlert } from '../api/types';
import LoadingSpinner from '../components/LoadingSpinner';
import { cn } from '../utils/cn';

interface AnalyticsData {
  performanceMetrics: {
    period: string;
    avgHealthScore: number;
    totalUptime: number;
    totalDowntime: number;
    efficiency: number;
  }[];
  alertTrends: {
    date: string;
    critical: number;
    warning: number;
    info: number;
  }[];
  machineUtilization: {
    machineId: string;
    machineName: string;
    utilization: number;
    efficiency: number;
    uptime: number;
  }[];
  maintenanceSchedule: {
    machineId: string;
    machineName: string;
    nextMaintenance: string;
    daysUntil: number;
    type: string;
  }[];
  energyConsumption: {
    date: string;
    consumption: number;
    cost: number;
  }[];
  faultDistribution: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

type TimeRange = '7d' | '30d' | '90d' | '1y';

const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'health' | 'uptime' | 'efficiency'>('health');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load machines and alerts data
      const [machinesResponse, alarmsResponse, mlAlertsResponse] = await Promise.all([
        machinesApi.getMachines(),
        alertsApi.getAlarms(),
        alertsApi.getMLAlerts(),
      ]);
      
      const machines = machinesResponse.data;
      const alarms = alarmsResponse.data;
      const mlAlerts = mlAlertsResponse.data;
      
      // Generate analytics data (in a real app, this would come from analytics APIs)
      const analytics = generateAnalyticsData(machines, alarms, mlAlerts, timeRange);
      setAnalyticsData(analytics);
      
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateAnalyticsData = (
    machines: Machine[],
    alarms: Alarm[],
    mlAlerts: MLAlert[],
    range: TimeRange
  ): AnalyticsData => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const now = new Date();
    
    // Generate performance metrics over time
    const performanceMetrics = Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      return {
        period: date.toISOString().split('T')[0],
        avgHealthScore: 85 + Math.random() * 10 + Math.sin(i / 7) * 5,
        totalUptime: 95 + Math.random() * 4,
        totalDowntime: Math.random() * 5,
        efficiency: 80 + Math.random() * 15,
      };
    });
    
    // Generate alert trends
    const alertTrends = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        critical: Math.floor(Math.random() * 5),
        warning: Math.floor(Math.random() * 10) + 2,
        info: Math.floor(Math.random() * 8) + 1,
      };
    });
    
    // Generate machine utilization data
    const machineUtilization = machines.map(machine => ({
      machineId: machine.id,
      machineName: machine.name,
      utilization: 70 + Math.random() * 25,
      efficiency: machine.healthScore * 0.9 + Math.random() * 10,
      uptime: machine.uptime,
    }));
    
    // Generate maintenance schedule
    const maintenanceSchedule = machines.map((machine, index) => {
      const nextDate = new Date(now.getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000);
      return {
        machineId: machine.id,
        machineName: machine.name,
        nextMaintenance: nextDate.toISOString(),
        daysUntil: Math.floor((nextDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        type: ['Preventive', 'Predictive', 'Corrective'][index % 3],
      };
    });
    
    // Generate energy consumption data
    const energyConsumption = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const consumption = 1000 + Math.random() * 500 + Math.sin(i / 7) * 200;
      return {
        date: date.toISOString().split('T')[0],
        consumption,
        cost: consumption * 0.12, // $0.12 per kWh
      };
    });
    
    // Generate fault distribution
    const faultCategories = ['Mechanical', 'Electrical', 'Software', 'Sensor', 'Communication'];
    const totalFaults = alarms.length + mlAlerts.length;
    const faultDistribution = faultCategories.map((category, index) => {
      const count = Math.floor(totalFaults * (0.3 - index * 0.05) + Math.random() * 5);
      return {
        category,
        count,
        percentage: totalFaults > 0 ? (count / totalFaults) * 100 : 0,
      };
    });
    
    return {
      performanceMetrics,
      alertTrends,
      machineUtilization,
      maintenanceSchedule,
      energyConsumption,
      faultDistribution,
    };
  };

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case '1y': return 'Last year';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Performance insights and trends for your industrial IoT platform
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="input w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Health Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.performanceMetrics.slice(-1)[0]?.avgHealthScore.toFixed(1)}%
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">+2.5% from last period</span>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.performanceMetrics.slice(-1)[0]?.totalUptime.toFixed(1)}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">Target: 99.5%</span>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Energy Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  analyticsData.energyConsumption.reduce((sum, item) => sum + item.cost, 0)
                )}
              </p>
            </div>
            <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-4">
            <span className="text-sm text-red-600">-5.2% from last period</span>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="input w-auto text-sm"
            >
              <option value="health">Health Score</option>
              <option value="uptime">Uptime</option>
              <option value="efficiency">Efficiency</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.performanceMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [`${value.toFixed(1)}%`, selectedMetric]}
              />
              <Line
                type="monotone"
                dataKey={selectedMetric === 'health' ? 'avgHealthScore' : selectedMetric === 'uptime' ? 'totalUptime' : 'efficiency'}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.alertTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                name="Critical"
              />
              <Area
                type="monotone"
                dataKey="warning"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                name="Warning"
              />
              <Area
                type="monotone"
                dataKey="info"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Info"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Machine Utilization and Fault Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Utilization */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Machine Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.machineUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="machineName" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilization']}
              />
              <Bar dataKey="utilization" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fault Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fault Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.faultDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analyticsData.faultDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Energy Consumption and Maintenance Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Consumption */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Energy Consumption</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.energyConsumption}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number, name: string) => [
                  name === 'consumption' ? `${value.toFixed(0)} kWh` : formatCurrency(value),
                  name === 'consumption' ? 'Consumption' : 'Cost'
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="consumption"
                stroke="#22c55e"
                strokeWidth={2}
                name="Consumption (kWh)"
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#ef4444"
                strokeWidth={2}
                name="Cost ($)"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Maintenance Schedule */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Maintenance</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {analyticsData.maintenanceSchedule
              .sort((a, b) => a.daysUntil - b.daysUntil)
              .map((item) => (
                <div key={item.machineId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.machineName}</p>
                    <p className="text-xs text-gray-500">{item.type} Maintenance</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-medium',
                      item.daysUntil <= 7 ? 'text-red-600' : 
                      item.daysUntil <= 14 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {item.daysUntil} days
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.nextMaintenance).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;