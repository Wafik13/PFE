import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  trend?: 'up' | 'down' | 'flat';
  trendValue?: number;
  maxValue?: number;
  showProgress?: boolean;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  icon,
  color = 'primary',
  trend,
  trendValue,
  maxValue = 100,
  showProgress = true,
  subtitle,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon fontSize="small" color="success" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" color="error" />;
      case 'flat':
        return <TrendingFlatIcon fontSize="small" color="disabled" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      case 'flat':
        return 'default';
      default:
        return 'default';
    }
  };

  const getProgressColor = () => {
    if (unit === '%') {
      if (value > 90) return 'error';
      if (value > 75) return 'warning';
      return 'success';
    }
    return color;
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(1);
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ 
              p: 1, 
              borderRadius: 1, 
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {icon}
            </Box>
          )}
        </Box>

        {/* Value */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: color === 'error' ? 'error.main' : 'text.primary',
            }}
          >
            {formatValue(value)}
            {unit && (
              <Typography 
                component="span" 
                variant="h6" 
                sx={{ ml: 0.5, color: 'text.secondary' }}
              >
                {unit}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Progress Bar */}
        {showProgress && unit === '%' && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(value, 100)}
              color={getProgressColor() as any}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'grey.200',
              }}
            />
          </Box>
        )}

        {/* Trend */}
        {trend && trendValue !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTrendIcon()}
            <Chip
              label={`${trendValue.toFixed(1)}%`}
              size="small"
              color={getTrendColor() as any}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              vs last period
            </Typography>
          </Box>
        )}

        {/* Status Indicator */}
        {!trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: (() => {
                  if (unit === '%') {
                    if (value > 90) return 'error.main';
                    if (value > 75) return 'warning.main';
                    return 'success.main';
                  }
                  return `${color}.main`;
                })(),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {(() => {
                if (unit === '%') {
                  if (value > 90) return 'Critical';
                  if (value > 75) return 'Warning';
                  return 'Normal';
                }
                return 'Active';
              })()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;