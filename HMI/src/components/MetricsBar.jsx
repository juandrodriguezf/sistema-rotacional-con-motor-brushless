import { Gauge, Zap, ArrowUpDown } from 'lucide-react';
import './MetricsBar.css';

export default function MetricsBar({ latestData, isConnected }) {
  const sp = latestData?.sp ?? '--';
  const fb = latestData?.fb ?? '--';
  const err = latestData?.err ?? '--';
  const out = latestData?.out ?? '--';

  const isActive = isConnected && latestData;

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
          PWM Output
        </span>
        <span className="metric-value">
          {out}
        </span>
      </div>


    </div>
  );
}
