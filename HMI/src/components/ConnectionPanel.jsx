import { Plug, Unplug } from 'lucide-react';
import './ConnectionPanel.css';

export default function ConnectionPanel({ isConnected, portInfo, onConnect, onDisconnect, dataCount }) {
  return (
    <div className="connection-panel glass-card">
      <div className="section-header">
        <Plug className="icon" size={16} />
        <h3>Conexión Serial</h3>
      </div>

      <div className="connection-body">
        {isConnected ? (
          <>
            <div className="status-badge connected">
              <span className="status-dot"></span>
              Conectado
            </div>

            {portInfo && (
              <p className="port-info">
                USB {portInfo.usbVendorId ? `(VID: ${portInfo.usbVendorId})` : ''}
              </p>
            )}

            <div className="data-counter">
              <span className="counter-label">Muestras</span>
              <span className="counter-value">{dataCount.toLocaleString()}</span>
            </div>

            <button className="btn btn-disconnect" onClick={onDisconnect}>
              <Unplug size={16} />
              Desconectar & Guardar
            </button>
          </>
        ) : (
          <>
            <div className="status-badge disconnected">
              <span className="status-dot"></span>
              Desconectado
            </div>

            <p className="connection-hint">
              Selecciona el puerto COM del PIC16F18426
            </p>

            <button className="btn btn-connect" onClick={onConnect}>
              <Plug size={16} />
              Conectar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
