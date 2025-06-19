import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { machinesApi } from '../api/machines';
import { alertsApi } from '../api/alerts';
import { Machine, Alarm, MLAlert } from '../api/types';
import LoadingSpinner from '../components/LoadingSpinner';
import { cn } from '../utils/cn';

interface SystemMetrics {
  totalMachines: number;
  operationalMachines: number;
  warningMachines: number;
  offlineMachines: number;
  totalAlerts: number;
  criticalAlerts: number;
  averageHealthScore: number;
  systemUptime: number;
}

interface RecentActivity {
  id: string;
  type: 'alarm' | 'maintenance' | 'status_change';
  message: string;
  timestamp: string;
  severity?: 'critical' | 'warning' | 'info';
  machineId?: string;
  machineName?: string;
}

const OverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topMachines, setTopMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverviewData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadOverviewData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOverviewData = async () => {
    try {
      setError(null);
      
      // Load machines data
      const machinesResponse = await machinesApi.getMachines();
      const machines = machinesResponse.data;
      
      // Load alarms data
      const alarmsResponse = await alertsApi.getAlarms();
      const alarms = alarmsResponse.data;
      
      // Load ML alerts data
      const mlAlertsResponse = await alertsApi.getMLAlerts();
      const mlAlerts = mlAlertsResponse.data;
      
      // Calculate system metrics
      const totalMachines = machines.length;
      const operationalMachines = machines.filter(m => m.status === 'operational').length;
      const warningMachines = machines.filter(m => m.status === 'warning').length;
      const offlineMachines = machines.filter(m => m.status === 'offline').length;
      
      const totalAlerts = alarms.length + mlAlerts.length;
      const criticalAlerts = alarms.filter(a => a.severity === 'critical').length +
                           mlAlerts.filter(a => a.severity === 'critical').length;
      
      const averageHealthScore = machines.reduce((sum, m) => sum + m.healthScore, 0) / totalMachines || 0;
      const systemUptime = 99.2; // This would come from a real monitoring system
      
      setMetrics({
        totalMachines,
        operationalMachines,
        warningMachines,
        offlineMachines,
        totalAlerts,
        criticalAlerts,
        averageHealthScore,
        systemUptime,
      });
      
      // Get top performing machines (highest health scores)
      const sortedMachines = [...machines]
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, 5);
      setTopMachines(sortedMachines);
      
      // Generate recent activity (in a real app, this would come from an activity log API)
      const activity: RecentActivity[] = [
        ...alarms.slice(0, 3).map(alarm => ({
          id: alarm.id,
          type: 'alarm' as const,
          message: `${alarm.severity.toUpperCase()}: ${alarm.message}`,
          timestamp: alarm.timestamp,
          severity: alarm.severity,
          machineId: alarm.machineId,
          machineName: machines.find(m => m.id === alarm.machineId)?.name || 'Unknown',
        })),
        {
          id: 'maintenance-1',
          type: 'maintenance',
          message: 'Scheduled maintenance completed on CNC-001',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          severity: 'info',
          machineId: 'machine-1',
          machineName: 'CNC Machine 001',
        },
        {
          id: 'status-1',
          type: 'status_change',
          message: 'Robot ARM-003 returned to operational status',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          severity: 'info',
          machineId: 'machine-3',
          machineName: 'Robot ARM 003',
        },
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(activity);
      
    } catch (err) {
      console.error('Failed to load overview data:', err);
      setError('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'alarm':
        return ExclamationTriangleIcon;
      case 'maintenance':
        return CogIcon;
      case 'status_change':
        return CheckCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getActivityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

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
          <XCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-600 mt-1">
          Real-time monitoring and status of your industrial IoT platform
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Machines */}
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CogIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Machines</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalMachines}</p>
            </div>
          </div>
          <div className="mt-4 flex text-sm">
            <span className="text-green-600 flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              {metrics.operationalMachines} operational
            </span>
          </div>
        </div>

        {/* System Health */}
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Health Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.averageHealthScore.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              {metrics.averageHealthScore >= 90 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={metrics.averageHealthScore >= 90 ? 'text-green-600' : 'text-red-600'}>
                {metrics.averageHealthScore >= 90 ? 'Excellent' : 'Needs attention'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAlerts}</p>
            </div>
          </div>
          <div className="mt-4 flex text-sm">
            <span className="text-red-600">
              {metrics.criticalAlerts} critical
            </span>
          </div>
        </div>

        {/* System Uptime */}
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.systemUptime}%</p>
            </div>
          </div>
          <div className="mt-4 flex text-sm">
            <span className="text-green-600">Last 30 days</span>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Machine Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Operational</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{metrics.operationalMachines}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Warning</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{metrics.warningMachines}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Offline</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{metrics.offlineMachines}</span>
            </div>
          </div>
        </div>

        {/* Top Performing Machines */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing</h3>
          <div className="space-y-3">
            {topMachines.map((machine, index) => (
              <div key={machine.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-gray-500 w-4">#{index + 1}</span>
                  <Link
                    to={`/machines/${machine.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 ml-2 truncate"
                  >
                    {machine.name}
                  </Link>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {machine.healthScore}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/machines"
              className="block w-full btn btn-outline text-left"
            >
              View All Machines
            </Link>
            <Link
              to="/alerts"
              className="block w-full btn btn-outline text-left"
            >
              Manage Alerts
            </Link>
            <Link
              to="/analytics"
              className="block w-full btn btn-outline text-left"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="px-6 py-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <IconComponent className={cn('h-5 w-5', getActivityColor(activity.severity))} />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>{formatTimestamp(activity.timestamp)}</span>
                        {activity.machineName && (
                          <>
                            <span className="mx-1">•</span>
                            <Link
                              to={`/machines/${activity.machineId}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {activity.machineName}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;