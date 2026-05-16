import { useState, useCallback, useRef, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import useSerial from './hooks/useSerial';
import { parseCSVLine, downloadCSV } from './utils/csvUtils';
import ConnectionPanel from './components/ConnectionPanel';
import PidTuner from './components/PidTuner';
import RealtimeChart from './components/RealtimeChart';
import PwmChart from './components/PwmChart';
import MetricsBar from './components/MetricsBar';
import MotorIndicator from './components/MotorIndicator';
import ThemeToggle from './components/ThemeToggle';
import PidAnalyzer from './components/PidAnalyzer';
import './App.css';

const MAX_CHART_POINTS = 600;
const TARGET_HZ = 120;
const EMA_ALPHA = 0.1;

export default function App() {
  const [chartData, setChartData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [sampleRate, setSampleRate] = useState(0);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState('dark');
  const dataBufferRef = useRef([]);
  const startTimeRef = useRef(null);
  const lastTimeRef = useRef(null);
  const emaHzRef = useRef(TARGET_HZ);
  const pidParamsRef = useRef({ kp: 50, ki: 10, kd: 0 });

  const getPidParams = useCallback(() => pidParamsRef.current, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleData = useCallback((line) => {
    const parsed = parseCSVLine(line);
    if (!parsed) return;

    const now = performance.now();
    if (startTimeRef.current === null) {
      startTimeRef.current = now;
    }

    const elapsed = now - startTimeRef.current;

    // Sample rate calculation (EMA smoothed)
    if (lastTimeRef.current !== null) {
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        const instantHz = 1000 / dt;
        emaHzRef.current = EMA_ALPHA * instantHz + (1 - EMA_ALPHA) * emaHzRef.current;
        setSampleRate(Math.round(emaHzRef.current));
      }
    }
    lastTimeRef.current = now;

    const dataPoint = {
      time: elapsed,
      sp: parsed.sp,
      fb: parsed.fb,
      err: parsed.err,
      out: parsed.out,
      ctrlk: parsed.ctrlk,
    };

    // Store in full buffer for CSV export
    dataBufferRef.current.push(dataPoint);

    // Update latest for metrics
    setLatestData(dataPoint);

    // Update chart with windowed data
    setChartData((prev) => {
      const next = [...prev, dataPoint];
      if (next.length > MAX_CHART_POINTS) {
        return next.slice(next.length - MAX_CHART_POINTS);
      }
      return next;
    });
  }, []);

  const { isConnected, portInfo, connect, disconnect, send } = useSerial({
    onData: handleData,
  });

  const handleConnect = useCallback(async () => {
    dataBufferRef.current = [];
    startTimeRef.current = null;
    lastTimeRef.current = null;
    emaHzRef.current = TARGET_HZ;
    setChartData([]);
    setLatestData(null);
    setSampleRate(0);

    await connect();
    showToast('Puerto serial conectado', 'success');
  }, [connect, showToast]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();

    if (dataBufferRef.current.length > 0) {
      downloadCSV(dataBufferRef.current);
      showToast(
        `Sesión guardada: ${dataBufferRef.current.length.toLocaleString()} muestras`,
        'success'
      );
    } else {
      showToast('Desconectado (sin datos para guardar)', 'info');
    }
  }, [disconnect, showToast]);

  const handleSendPID = useCallback(
    async (cmd) => {
      await send(cmd);
      showToast(`Enviado: ${cmd.trim()}`, 'info');

      const type = cmd[0];
      const rest = cmd.slice(1).replace(/[\n\r]/g, '');
      const val = parseInt(rest);
      if (!isNaN(val) && (type === 'P' || type === 'I' || type === 'D')) {
        pidParamsRef.current = {
          ...pidParamsRef.current,
          [type === 'P' ? 'kp' : type === 'I' ? 'ki' : 'kd']: val,
        };
      }
    },
    [send, showToast]
  );

  // Determine motor direction
  const direction = isConnected && latestData
    ? latestData.out > 0
      ? 'CW'
      : latestData.out < 0
        ? 'CCW'
        : 'STOP'
    : '--';

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="header-title">PID Controller</h1>
            <p className="header-subtitle">PIC16F18426 · Sistema Rotacional</p>
          </div>
        </div>
        <div className="header-right">
          {isConnected && (
            <div className="status-badge connected">
              <span className="status-dot"></span>
              Online
            </div>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Left Sidebar */}
        <aside className="sidebar fade-in">
          <ConnectionPanel
            isConnected={isConnected}
            portInfo={portInfo}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            dataCount={dataBufferRef.current.length}
          />
          <PidTuner isConnected={isConnected} onSend={handleSendPID} />
          <MotorIndicator
            direction={direction}
            pwmOutput={latestData?.out}
            isConnected={isConnected}
          />
          <PidAnalyzer
            chartData={chartData}
            getParams={getPidParams}
            onApply={handleSendPID}
            isConnected={isConnected}
          />
        </aside>

        {/* Right Content Area */}
        <div className="content-area">
          {/* Metrics Bar */}
          <div className="fade-in" style={{ animationDelay: '0.1s' }}>
            <MetricsBar latestData={latestData} sampleRate={sampleRate} isConnected={isConnected} />
          </div>

          {/* Charts Grid */}
          <div className="charts-grid fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Main angle chart */}
            <div className="chart-main">
              <RealtimeChart chartData={chartData} isConnected={isConnected} theme={theme} />
            </div>

            {/* PWM chart */}
            <div className="chart-pwm">
              <PwmChart chartData={chartData} isConnected={isConnected} theme={theme} />
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} key={Date.now()}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
