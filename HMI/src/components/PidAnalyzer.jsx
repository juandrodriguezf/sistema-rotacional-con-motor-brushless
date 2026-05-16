import { useState, useEffect, useRef } from 'react';
import { Activity, Check, X, Zap } from 'lucide-react';
import {
  detectStep,
  analyzeResponse,
  scoreMetrics,
  calculateGlobalScore,
  getVerdict,
  generateRecommendation,
} from '../utils/pidAnalyzer';
import './PidAnalyzer.css';

const ANALYSIS_WINDOW_MS = 5000;
const COOLDOWN_MS = 1000;

export default function PidAnalyzer({ chartData, getParams, onApply, isConnected }) {
  const [state, setState] = useState('idle');
  const [metrics, setMetrics] = useState(null);
  const [scored, setScored] = useState(null);
  const [globalScore, setGlobalScore] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [analyzingElapsed, setAnalyzingElapsed] = useState(0);
  const [invalidReason, setInvalidReason] = useState(null);

  const stepIdxRef = useRef(null);
  const stepTimeRef = useRef(null);
  const lastStepTimeRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isConnected || chartData.length < 20) return;

    const stepIdx = detectStep(chartData);

    if (!stepIdx) {
      if (state === 'idle') return;
      if (state === 'analyzing') {
        const elapsed = Date.now() - stepTimeRef.current;
        if (elapsed > ANALYSIS_WINDOW_MS + 1000) {
          finishAnalysis();
        }
      }
      return;
    }

    const now = Date.now();
    const stepTime = chartData[stepIdx].time;

    if (stepTime - lastStepTimeRef.current < COOLDOWN_MS) return;

    if (state === 'analyzing' && stepIdx !== stepIdxRef.current) {
      lastStepTimeRef.current = stepTime;
      stepIdxRef.current = stepIdx;
      stepTimeRef.current = now;
      setAnalyzingElapsed(0);
      return;
    }

    if (state === 'idle' || state === 'ready' || state === 'invalid') {
      lastStepTimeRef.current = stepTime;
      stepIdxRef.current = stepIdx;
      stepTimeRef.current = now;
      setState('analyzing');
      setMetrics(null);
      setRecommendation(null);
      setInvalidReason(null);
      setAnalyzingElapsed(0);
    }
  }, [chartData, isConnected, state]);

  useEffect(() => {
    if (state !== 'analyzing') return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepTimeRef.current;
      setAnalyzingElapsed(elapsed);

      if (elapsed > ANALYSIS_WINDOW_MS) {
        finishAnalysis();
      }
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [state]);

  const finishAnalysis = () => {
    clearInterval(timerRef.current);

    const result = analyzeResponse(chartData, stepIdxRef.current, ANALYSIS_WINDOW_MS);

    if (!result) {
      setState('invalid');
      setInvalidReason('Cambio muy lento o ventana incompleta');
      return;
    }

    if (result.oscillationCount > 20) {
      setState('invalid');
      setInvalidReason('Demasiadas oscilaciones — datos no confiables');
      return;
    }

    setMetrics(result);

    const s = scoreMetrics(result);
    setScored(s);

    const gs = calculateGlobalScore(s);
    setGlobalScore(gs);
    setVerdict(getVerdict(gs));

    const params = getParams();
    const rec = generateRecommendation(result, params);
    setRecommendation(rec);

    setState('ready');
  };

  const handleApply = () => {
    if (!recommendation) return;
    const { kp, ki, kd } = recommendation.params;
    onApply(`P${kp}\n`);
    setTimeout(() => onApply(`I${ki}\n`), 50);
    setTimeout(() => onApply(`D${kd}\n`), 100);
    setState('idle');
    setMetrics(null);
    setRecommendation(null);
  };

  const handleDismiss = () => {
    setState('idle');
    setMetrics(null);
    setRecommendation(null);
  };

  const progress = state === 'analyzing' ? Math.min(100, (analyzingElapsed / ANALYSIS_WINDOW_MS) * 100) : 0;

  return (
    <div className="pid-analyzer glass-card">
      <div className="section-header">
        <Activity className="icon" size={16} />
        <h3>Analizador PID</h3>
      </div>

      {state === 'idle' && (
        <div className="analyzer-idle">
          <Zap size={20} className="analyzer-idle-icon" />
          <p>Mueva el setpoint rápidamente para analizar</p>
        </div>
      )}

      {state === 'analyzing' && (
        <div className="analyzer-analyzing">
          <div className="analyzer-progress-bar">
            <div className="analyzer-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="analyzer-status">
            Analizando respuesta... ({(analyzingElapsed / 1000).toFixed(1)}s)
          </p>
        </div>
      )}

      {state === 'invalid' && (
        <div className="analyzer-invalid">
          <p className="analyzer-invalid-msg">⚠️ {invalidReason}</p>
          <p className="analyzer-invalid-hint">Mueva el pote de forma rápida y brusca</p>
        </div>
      )}

      {state === 'ready' && metrics && scored && verdict && (
        <div className="analyzer-ready">
          {/* Global Score */}
          <div className="analyzer-score">
            <div className="analyzer-score-circle" style={{ borderColor: verdict.color }}>
              <span className="analyzer-score-value" style={{ color: verdict.color }}>
                {globalScore}
              </span>
              <span className="analyzer-score-label">{verdict.label}</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="analyzer-metrics">
            <div className="analyzer-metric">
              <span className="analyzer-metric-label">Overshoot</span>
              <span className={`analyzer-metric-value status-${scored.overshoot.status}`}>
                {metrics.overshoot}%
              </span>
              <span className="analyzer-metric-status">{scored.overshoot.label}</span>
            </div>
            <div className="analyzer-metric">
              <span className="analyzer-metric-label">Rise time</span>
              <span className={`analyzer-metric-value status-${scored.riseTime.status}`}>
                {metrics.riseTime !== null ? `${metrics.riseTime}s` : 'N/A'}
              </span>
              <span className="analyzer-metric-status">{scored.riseTime.label}</span>
            </div>
            <div className="analyzer-metric">
              <span className="analyzer-metric-label">Settling</span>
              <span className={`analyzer-metric-value status-${scored.settlingTime.status}`}>
                {metrics.settlingTime !== null ? `${metrics.settlingTime}s` : 'N/A'}
              </span>
              <span className="analyzer-metric-status">{scored.settlingTime.label}</span>
            </div>
            <div className="analyzer-metric">
              <span className="analyzer-metric-label">Error est.</span>
              <span className={`analyzer-metric-value status-${scored.steadyStateError.status}`}>
                {metrics.steadyStateError}°
              </span>
              <span className="analyzer-metric-status">{scored.steadyStateError.label}</span>
            </div>
            <div className="analyzer-metric">
              <span className="analyzer-metric-label">Oscilaciones</span>
              <span className={`analyzer-metric-value status-${scored.oscillations.status}`}>
                {metrics.oscillationCount}
              </span>
              <span className="analyzer-metric-status">{scored.oscillations.label}</span>
            </div>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div className="analyzer-recommendation">
              <h4>Recomendación</h4>

              {recommendation.changes && recommendation.changes.length > 0 ? (
                <div className="analyzer-changes">
                  {recommendation.changes.map(({ param, from, to }) => (
                    <div className="analyzer-change" key={param}>
                      <span className="analyzer-change-param">{param}</span>
                      <span className="analyzer-change-from">{from}</span>
                      <span className="analyzer-change-arrow">→</span>
                      <span className="analyzer-change-to">{to}</span>
                      <span className="analyzer-change-delta">
                        ({to > from ? '+' : ''}{Math.round(((to - from) / from) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analyzer-no-changes">Sin cambios necesarios</p>
              )}

              {recommendation.suggestions.length > 0 && (
                <ul className="analyzer-suggestions">
                  {recommendation.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}

              <div className="analyzer-actions">
                <button
                  className="btn btn-apply"
                  onClick={handleApply}
                  disabled={recommendation.changes && recommendation.changes.length === 0}
                >
                  <Check size={14} />
                  Aplicar
                </button>
                <button className="btn btn-dismiss" onClick={handleDismiss}>
                  <X size={14} />
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
