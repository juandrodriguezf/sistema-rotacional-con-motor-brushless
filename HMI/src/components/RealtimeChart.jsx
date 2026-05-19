import { useRef, useEffect, useMemo } from 'react';
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
import { Activity, Pause, Play } from 'lucide-react';
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

const stepAnnotationPlugin = {
  id: 'stepAnnotations',
  afterDraw(chart) {
    const events = chart.config.options.plugins.stepAnnotations?.events;
    if (!events || events.length === 0) return;

    const { ctx, scales, chartArea } = chart;
    const xScale = scales.x;
    const yScale = scales.y;

    const labels = chart.data.labels;
    if (!labels || labels.length === 0) return;

    ctx.save();

    for (const evt of events) {
      const evtSec = evt.time / 1000;
      const label = evtSec.toFixed(1);

      let idx = labels.indexOf(label);
      if (idx === -1) {
        let bestDist = Infinity;
        for (let i = 0; i < labels.length; i++) {
          const d = Math.abs(parseFloat(labels[i]) - evtSec);
          if (d < bestDist) {
            bestDist = d;
            idx = i;
          }
        }
      }

      if (idx < 0 || idx >= labels.length) continue;

      const meta = chart.getDatasetMeta(0);
      if (!meta.data[idx]) continue;

      const x = meta.data[idx].x;

      if (x < chartArea.left || x > chartArea.right) continue;

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();

      ctx.setLineDash([]);

      const labelY = chartArea.top + 4;
      const text = `Step ${evt.sp}°`;
      ctx.font = '600 9px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(text).width;
      const padding = 4;
      const boxX = x - textWidth / 2 - padding;
      const boxY = labelY - 2;
      const boxW = textWidth + padding * 2;
      const boxH = 16;

      ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 3);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, boxY + boxH / 2);
    }

    ctx.restore();
  },
};

export default function RealtimeChart({ chartData, stepEvents = [], isConnected, theme, chartPaused, onTogglePause }) {
  const chartRef = useRef(null);

  const annotationEvents = useMemo(() => {
    if (chartData.length === 0) return [];
    const chartStart = chartData[0].time;
    return stepEvents
      .filter((e) => e.time >= chartStart)
      .map((e) => ({ time: e.time, sp: e.sp }));
  }, [stepEvents, chartData]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.update('none');
  }, [chartData, annotationEvents]);

  const labels = chartData.map((d) => (d.time / 1000).toFixed(1));

  const gridColor = theme === 'light'
    ? 'rgba(15, 23, 42, 0.06)'
    : 'rgba(148, 163, 184, 0.06)';

  const tickColor = theme === 'light' ? '#475569' : '#64748b';

  const data = {
    labels,
    datasets: [
      {
        label: 'Setpoint (Deseado)',
        data: chartData.map((d) => d.sp),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
        borderColor: theme === 'light' ? '#1d4ed8' : '#facc15',
        backgroundColor: theme === 'light'
          ? 'rgba(30, 64, 175, 0.08)'
          : 'rgba(250, 204, 21, 0.08)',
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
      stepAnnotations: { events: annotationEvents },
      legend: {
        display: true,
        position: 'bottom',
        align: 'center',
        labels: {
          color: tickColor,
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
          color: tickColor,
          font: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        },
        ticks: {
          color: tickColor,
          font: { family: 'JetBrains Mono, monospace', size: 10 },
          maxTicksLimit: 12,
          maxRotation: 0,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Ángulo (°)',
          color: tickColor,
          font: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        },
        ticks: {
          color: tickColor,
          font: { family: 'JetBrains Mono, monospace', size: 10 },
          callback: (val) => `${val}°`,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
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
        <div className="chart-header-badges">
          {chartPaused && (
            <div className="paused-badge">PAUSED</div>
          )}
          {isConnected && (
            <div className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </div>
          )}
          {isConnected && (
            <button
              className="pause-btn"
              onClick={onTogglePause}
              title={chartPaused ? 'Reanudar' : 'Pausar'}
            >
              {chartPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          )}
        </div>
      </div>

      <div className={`chart-container${chartPaused ? ' paused' : ''}`}>
        {chartData.length === 0 ? (
          <div className="chart-empty">
            <p>Esperando datos del sistema...</p>
          </div>
        ) : (
          <Line ref={chartRef} data={data} options={options} plugins={[stepAnnotationPlugin]} />
        )}
      </div>
    </div>
  );
}
