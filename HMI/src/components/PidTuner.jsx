import { useState } from 'react';
import { Sliders, Send } from 'lucide-react';
import './PidTuner.css';

export default function PidTuner({ isConnected, onSend }) {
  const [kp, setKp] = useState(50);
  const [ki, setKi] = useState(10);
  const [kd, setKd] = useState(0);

  const handleSend = (param, value) => {
    if (!isConnected) return;
    const cmd = `${param}${value}\n`;
    onSend(cmd);
  };

  const handleSendAll = () => {
    if (!isConnected) return;
    onSend(`P${kp}\n`);
    setTimeout(() => onSend(`I${ki}\n`), 50);
    setTimeout(() => onSend(`D${kd}\n`), 100);
  };

  const params = [
    {
      label: 'Kp',
      sublabel: 'Proporcional',
      value: kp,
      setter: setKp,
      param: 'P',
      min: 0,
      max: 200,
      color: 'var(--cyan-400)',
    },
    {
      label: 'Ki',
      sublabel: 'Integral',
      value: ki,
      setter: setKi,
      param: 'I',
      min: 0,
      max: 100,
      color: 'var(--orange-400)',
    },
    {
      label: 'Kd',
      sublabel: 'Derivativo',
      value: kd,
      setter: setKd,
      param: 'D',
      min: 0,
      max: 100,
      color: 'var(--green-400)',
    },
  ];

  return (
    <div className="pid-tuner glass-card">
      <div className="section-header">
        <Sliders className="icon" size={16} />
        <h3>Sintonización PID</h3>
      </div>

      <div className="pid-params">
        {params.map(({ label, sublabel, value, setter, param, min, max, color }) => (
          <div className="pid-param" key={label}>
            <div className="pid-param-header">
              <div className="pid-param-labels">
                <span className="pid-param-name" style={{ color }}>{label}</span>
                <span className="pid-param-sublabel">{sublabel}</span>
              </div>
              <input
                type="number"
                className="input-field pid-input"
                value={value}
                min={min}
                max={max}
                onChange={(e) => setter(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
                disabled={!isConnected}
              />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={(e) => setter(parseInt(e.target.value))}
              disabled={!isConnected}
              style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--bg-deep) ${((value - min) / (max - min)) * 100}%, var(--bg-deep) 100%)`,
              }}
            />
            <div className="pid-range-labels">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-send"
        onClick={handleSendAll}
        disabled={!isConnected}
      >
        <Send size={14} />
        Enviar Parámetros
      </button>
    </div>
  );
}
