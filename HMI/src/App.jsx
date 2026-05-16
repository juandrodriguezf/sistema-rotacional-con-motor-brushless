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
import './App.css';

const MAX_CHART_POINTS = 600;

export default function App() {
  const [chartData, setChartData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState('dark');
  const dataBufferRef = useRef([]);
  const startTimeRef = useRef(null);

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

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    const elapsed = performance.now() - startTimeRef.current;

    const dataPoint = {
      time: elapsed,
      sp: parsed.sp,
      fb: parsed.fb,
      err: parsed.err,
      out: parsed.out,
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
    setChartData([]);
    setLatestData(null);

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
        </aside>

        {/* Right Content Area */}
        <div className="content-area">
          {/* Metrics Bar */}
          <div className="fade-in" style={{ animationDelay: '0.1s' }}>
            <MetricsBar latestData={latestData} isConnected={isConnected} />
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
