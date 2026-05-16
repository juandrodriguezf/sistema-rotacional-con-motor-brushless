import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity } from 'lucide-react';
import './RealtimeChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function RealtimeChart({ chartData, isConnected }) {
  const chartRef = useRef(null);

  // Update chart data efficiently
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.update('none'); // 'none' disables animation for perf at 120Hz
  }, [chartData]);

  const labels = chartData.map((d) => (d.time / 1000).toFixed(1));

  const data = {
    labels,
    datasets: [
      {
        label: 'Setpoint (Deseado)',
        data: chartData.map((d) => d.sp),
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.08)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Feedback (Medido)',
        data: chartData.map((d) => d.fb),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.08)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '600',
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 35, 50, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148, 163, 184, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        titleFont: {
          family: 'JetBrains Mono, monospace',
          size: 11,
          weight: '600',
        },
        bodyFont: {
          family: 'JetBrains Mono, monospace',
          size: 11,
        },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        callbacks: {
          title: (items) => {
            if (items.length > 0) {
              return `t = ${items[0].label}s`;
            }
            return '';
          },
          label: (context) => {
            return ` ${context.dataset.label}: ${context.parsed.y}°`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tiempo (s)',
          color: '#64748b',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '500',
          },
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'JetBrains Mono, monospace',
            size: 10,
          },
          maxTicksLimit: 12,
          maxRotation: 0,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Ángulo (°)',
          color: '#64748b',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '500',
          },
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'JetBrains Mono, monospace',
            size: 10,
          },
          callback: (val) => `${val}°`,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.06)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="realtime-chart glass-card">
      <div className="chart-header">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <Activity className="icon" size={16} />
          <h3>Respuesta Temporal</h3>
        </div>
        {isConnected && (
          <div className="live-badge">
            <span className="live-dot"></span>
            LIVE
          </div>
        )}
      </div>

      <div className="chart-container">
        {chartData.length === 0 ? (
          <div className="chart-empty">
            <p>Esperando datos del sistema...</p>
          </div>
        ) : (
          <Line ref={chartRef} data={data} options={options} />
        )}
      </div>
    </div>
  );
}
