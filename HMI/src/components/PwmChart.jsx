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
import { Zap } from 'lucide-react';
import './PwmChart.css';

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

export default function PwmChart({ chartData, isConnected, theme }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.update('none');
  }, [chartData]);

  const labels = chartData.map((d) => (d.time / 1000).toFixed(1));

  const gridColor = theme === 'light'
    ? 'rgba(15, 23, 42, 0.06)'
    : 'rgba(148, 163, 184, 0.06)';

  const tickColor = theme === 'light' ? '#475569' : '#64748b';

  const data = {
    labels,
    datasets: [
      {
        label: 'PWM Output',
        data: chartData.map((d) => d.out),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
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
          color: tickColor,
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: theme === 'light'
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(26, 35, 50, 0.95)',
        titleColor: theme === 'light' ? '#0f172a' : '#f1f5f9',
        bodyColor: tickColor,
        borderColor: theme === 'light'
          ? 'rgba(15, 23, 42, 0.08)'
          : 'rgba(148, 163, 184, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        titleFont: { family: 'JetBrains Mono, monospace', size: 11, weight: '600' },
        bodyFont: { family: 'JetBrains Mono, monospace', size: 11 },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        callbacks: {
          title: (items) => items.length > 0 ? `t = ${items[0].label}s` : '',
          label: (ctx) => ` PWM: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tiempo (s)',
          color: tickColor,
          font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
        },
        ticks: {
          color: tickColor,
          font: { family: 'JetBrains Mono, monospace', size: 9 },
          maxTicksLimit: 10,
          maxRotation: 0,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'PWM',
          color: tickColor,
          font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
        },
        min: -255,
        max: 255,
        ticks: {
          color: tickColor,
          font: { family: 'JetBrains Mono, monospace', size: 9 },
          stepSize: 85,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="pwm-chart glass-card">
      <div className="pwm-chart-header">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <Zap className="icon" size={16} style={{ color: '#a78bfa' }} />
          <h3>Señal PWM</h3>
        </div>
      </div>
      <div className="pwm-chart-container">
        {chartData.length === 0 ? (
          <div className="pwm-chart-empty">
            <p>Esperando datos...</p>
          </div>
        ) : (
          <Line ref={chartRef} data={data} options={options} />
        )}
      </div>
    </div>
  );
}
