import { RotateCw } from 'lucide-react';
import './MotorIndicator.css';

export default function MotorIndicator({ direction, pwmOutput, isConnected }) {
  // direction: 'CW', 'CCW', 'STOP'
  const isSpinning = isConnected && direction !== 'STOP' && direction !== '--';
  const speed = Math.abs(pwmOutput || 0);
  // Map PWM 0-255 to animation duration 2s-0.3s (faster = shorter duration)
  const duration = speed > 0 ? Math.max(0.3, 2 - (speed / 255) * 1.7) : 2;

  const dirLabel =
    direction === 'CW'
      ? 'Horario'
      : direction === 'CCW'
        ? 'Anti-horario'
        : 'Detenido';

  const dirColor =
    direction === 'CW'
      ? 'var(--yellow-400)'
      : direction === 'CCW'
        ? 'var(--orange-400)'
        : 'var(--text-muted)';

  return (
    <div className="motor-indicator glass-card">
      <div className="section-header">
        <RotateCw className="icon" size={16} />
        <h3>Motor</h3>
      </div>

      <div className="motor-visual">
        {/* Outer ring */}
        <div className="motor-ring">
          {/* Rotating disc */}
          <div
            className={`motor-disc ${isSpinning ? 'spinning' : ''} ${direction === 'CCW' ? 'reverse' : ''}`}
            style={{
              animationDuration: `${duration}s`,
              borderColor: isSpinning ? dirColor : 'var(--border-subtle)',
            }}
          >
            {/* Shaft marks */}
            <div className="shaft-mark mark-1" style={{ background: isSpinning ? dirColor : 'var(--text-muted)' }} />
            <div className="shaft-mark mark-2" style={{ background: isSpinning ? dirColor : 'var(--text-muted)' }} />
            <div className="shaft-mark mark-3" style={{ background: isSpinning ? dirColor : 'var(--text-muted)' }} />
            <div className="shaft-mark mark-4" style={{ background: isSpinning ? dirColor : 'var(--text-muted)' }} />
            {/* Center dot */}
            <div
              className="motor-center"
              style={{
                background: isSpinning ? dirColor : 'var(--text-muted)',
                boxShadow: isSpinning ? `0 0 12px ${dirColor}` : 'none',
              }}
            />
          </div>
        </div>

        {/* Direction arrow */}
        <div className="motor-direction-arrow">
          {isSpinning && (
            <svg
              className={`direction-svg ${direction === 'CCW' ? 'flip' : ''}`}
              width="80"
              height="24"
              viewBox="0 0 80 24"
            >
              <path
                d="M10 12 C 25 2, 55 2, 70 12"
                fill="none"
                stroke={dirColor}
                strokeWidth="2"
                strokeLinecap="round"
                className="arrow-path"
              />
              <polygon
                points="66,6 74,12 66,14"
                fill={dirColor}
                className="arrow-head"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="motor-info">
        <span className="motor-dir-label" style={{ color: dirColor }}>
          {dirLabel}
        </span>
        <span className="motor-speed-label">
          PWM: {isConnected ? `${speed}` : '--'} / 255
        </span>
      </div>
    </div>
  );
}
