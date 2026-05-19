# HMI Dashboard — PID Controller

Dashboard web para monitoreo y sintonización de controlador PID en PIC16F18426.

## Stack

- React 19 + Vite
- Chart.js (gráficas en tiempo real)
- Web Serial API (Chrome/Edge únicamente)
- lucide-react (iconos)

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
```

## Protocolo de Comunicación

### PIC → HMI (Telemetría)

CSV a 115200 baud, 120Hz:

```
setpoint_deg,feedback_deg,error,pwm_output,ctrlk_mv\r\n
```

### HMI → PIC (Comandos)

```
P<valor>\n   → Kp (0-200)
I<valor>\n   → Ki (0-100)
D<valor>\n   → Kd (0-100)
```

## PID Controller (Firmware)

- **Tipo**: PID discreto con enteros (sin FPU)
- **Frecuencia**: 120 Hz (cada 8.33ms)
- **Escalado**: Ganancias en centésimas (`PID_SCALE=100`), Kp=50 → ganancia real 0.50
- **Derivativa**: Sobre medición (evita derivative kick en cambios de setpoint)
- **Anti-windup**: Condicional (clamping)
- **Rate limiting**: Δ max = 100 por ciclo (~39% del rango)
- **Cambio de dirección**: Dead-time de 1 ciclo (8.33ms) con PWM=0

## Componentes

| Componente | Función |
|------------|---------|
| `ConnectionPanel` | Puerto serial + conectar/desconectar |
| `PidTuner` | Sliders Kp, Ki, Kd en tiempo real |
| `MotorIndicator` | Disco animado CW/CCW/STOP |
| `MetricsBar` | Setpoint, Feedback, Error, PWM, CTRLK (V), Sample Rate (Hz) |
| `RealtimeChart` | Ángulo vs tiempo (SP + FB) |
| `PwmChart` | PWM (0-255) vs tiempo |
| `PidAnalyzer` | Análisis de respuesta al escalón con scoring |
| `ThemeToggle` | Tema oscuro/claro |
