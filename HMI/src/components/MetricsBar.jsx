import { Gauge, Zap, ArrowUpDown, Activity, Clock } from 'lucide-react';
import './MetricsBar.css';

const TARGET_HZ = 120;

export default function MetricsBar({ latestData, sampleRate, isConnected }) {
  const sp = latestData?.sp ?? '--';
  const fb = latestData?.fb ?? '--';
  const err = latestData?.err ?? '--';
  const out = latestData?.out ?? '--';
  const ctrlk = latestData?.ctrlk != null ? `${(latestData.ctrlk / 1000).toFixed(3)}` : '--';

  const isActive = isConnected && latestData;

  // Sample rate color
  const hzColor = !isActive
    ? 'var(--text-muted)'
    : sampleRate >= 110 && sampleRate <= 130
      ? 'var(--green-400)'
      : sampleRate >= 80 && sampleRate <= 150
        ? 'var(--yellow-400)'
        : 'var(--red-400)';

  // Sample rate bar fill (max 200 Hz for scale)
  const hzFill = isActive ? Math.min((sampleRate / 200) * 100, 100) : 0;

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <span className="metric-label">
          <Gauge size={12} style={{ marginRight: 4 }} />
          Setpoint
        </span>
        <span className="metric-value" style={{ color: 'var(--orange-400)' }}>
          {sp}<span className="metric-unit">°</span>
        </span>
      </div>

      <div className="metric-card">
        <span className="metric-label">
          <Gauge size={12} style={{ marginRight: 4 }} />
          Feedback
        </span>
        <span className="metric-value" style={{ color: 'var(--yellow-400)' }}>
          {fb}<span className="metric-unit">°</span>
        </span>
      </div>

      <div className="metric-card">
        <span className="metric-label">
          <ArrowUpDown size={12} style={{ marginRight: 4 }} />
          Error
        </span>
        <span
          className="metric-value"
          style={{
            color:
              isActive && Math.abs(latestData.err) <= 2
                ? 'var(--green-400)'
                : 'var(--text-primary)',
          }}
        >
          {err}<span className="metric-unit">°</span>
        </span>
      </div>

      <div className="metric-card">
        <span className="metric-label">
          <Zap size={12} style={{ marginRight: 4 }} />
          PWM
        </span>
        <span className="metric-value">
          {out}
        </span>
      </div>

      <div className="metric-card">
        <span className="metric-label">
          <Activity size={12} style={{ marginRight: 4 }} />
          CTRLK
        </span>
        <span className="metric-value" style={{ color: 'var(--yellow-300)' }}>
          {ctrlk}<span className="metric-unit">V</span>
        </span>
      </div>

      <div className="metric-card">
        <span className="metric-label">
          <Clock size={12} style={{ marginRight: 4 }} />
          Sample Rate
        </span>
        <span className="metric-value" style={{ color: hzColor }}>
          {isActive ? `${sampleRate}` : '--'}<span className="metric-unit">Hz</span>
        </span>
        <div className="hz-bar-bg">
          <div
            className="hz-bar-fill"
            style={{
              width: `${hzFill}%`,
              backgroundColor: hzColor,
            }}
          />
        </div>
        <span className="hz-target">Target: {TARGET_HZ} Hz</span>
      </div>

    </div>
  );
}
