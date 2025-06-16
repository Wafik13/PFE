import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Box, Typography, useTheme } from '@mui/material';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RealTimeData {
  timestamp: string;
  metrics: {
    temperature: number;
    pressure: number;
    flow_rate: number;
    power_consumption: number;
    vibration: number;
    status: string;
  };
  deviceId: string;
}

interface RealTimeChartProps {
  data: RealTimeData[];
  height?: number;
  showLegend?: boolean;
  timeRange?: number; // in minutes
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  timeRange = 30,
}) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    // Filter data to show only the last timeRange minutes
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRange * 60 * 1000);
    
    const filteredData = data.filter(item => 
      new Date(item.timestamp) >= cutoffTime
    ).slice(-50); // Keep last 50 points for performance

    // Generate labels (timestamps)
    const labels = filteredData.map(item => 
      new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );

    // Generate mock data if no real data available
    const generateMockData = (baseValue: number, variance: number) => {
      return Array.from({ length: 20 }, (_, i) => {
        const time = new Date(now.getTime() - (19 - i) * 60000);
        return {
          x: time.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }),
          y: baseValue + (Math.random() - 0.5) * variance
        };
      });
    };

    const datasets = [
      {
        label: 'Temperature (°C)',
        data: filteredData.length > 0 
          ? filteredData.map(item => item.metrics.temperature)
          : generateMockData(25, 10).map(d => d.y),
        borderColor: theme.palette.error.main,
        backgroundColor: theme.palette.error.light + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Pressure (bar)',
        data: filteredData.length > 0
          ? filteredData.map(item => item.metrics.pressure)
          : generateMockData(15, 5).map(d => d.y),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.light + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Flow Rate (L/min)',
        data: filteredData.length > 0
          ? filteredData.map(item => item.metrics.flow_rate)
          : generateMockData(100, 20).map(d => d.y),
        borderColor: theme.palette.success.main,
        backgroundColor: theme.palette.success.light + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Power (kW)',
        data: filteredData.length > 0
          ? filteredData.map(item => item.metrics.power_consumption)
          : generateMockData(50, 15).map(d => d.y),
        borderColor: theme.palette.warning.main,
        backgroundColor: theme.palette.warning.light + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Vibration (mm/s)',
        data: filteredData.length > 0
          ? filteredData.map(item => item.metrics.vibration)
          : generateMockData(2, 1).map(d => d.y),
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.light + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ];

    return {
      labels: filteredData.length > 0 ? labels : generateMockData(0, 0).map(d => d.x),
      datasets,
    };
  }, [data, timeRange, theme]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: theme.palette.text.primary,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          maxTicksLimit: 8,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: theme.palette.background.paper,
        hoverBorderWidth: 2,
      },
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
  };

  return (
    <Box sx={{ height, position: 'relative' }}>
      {data.length === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: 1,
            zIndex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Displaying simulated real-time data
          </Typography>
        </Box>
      )}
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default RealTimeChart;