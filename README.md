# Sistema Rotacional con Control PID

Proyecto de mecatronica: sistema de control de posicion angular para una plataforma rotacional accionada por motor brushless (57BLDC75E-20730) con driver ZSX11H, implementado con un microcontrolador PIC16F18426 y un dashboard web en tiempo real.

## Arquitectura

```
┌─────────────────┐     UART 115200      ┌──────────────────┐
│   PIC16F18426   │ ◄──────────────────► │   HMI (React)    │
│   Firmware C    │   Telemetria CSV     │   Web Serial API │
│   Control PID   │   Comandos P/I/D     │   Chart.js       │
└─────────────────┘                      └──────────────────┘
```

## Estructura del Proyecto

```
m3.X/
├── main.c                          # Firmware PIC - PID + UART
├── mcc_generated_files/            # Drivers generados por MCC
├── calibracion/
│   ├── calib_pote.c                # Programa de calibracion de potenciometros
│   └── README.md                   # Instrucciones de calibracion
├── HMI/
│   ├── src/
│   │   ├── App.jsx                 # Componente principal
│   │   ├── hooks/useSerial.js      # Web Serial API
│   │   ├── components/
│   │   │   ├── ConnectionPanel.jsx # Panel de conexion
│   │   │   ├── PidTuner.jsx        # Sliders Kp/Ki/Kd
│   │   │   ├── RealtimeChart.jsx   # Grafica en tiempo real
│   │   │   └── MetricsBar.jsx      # Metricas numericas
│   │   └── utils/csvUtils.js       # Parser CSV + exportacion
│   └── package.json
└── documentos/
    ├── conexiones.md               # Pinout y conexiones hardware
    ├── mcc_config.md               # Configuracion de MCC
    └── AGENTS.md                   # Notas tecnicas del proyecto
```

## Firmware (PIC16F18426)

### Hardware

**Motor:** 57BLDC75E-20730 (brushless)
**Driver:** ZSX11H

| Pin | Funcion                                   |
| --- | ----------------------------------------- |
| RC3 | ADC - Potenciometro SETPOINT              |
| RC2 | ADC - Potenciometro FEEDBACK              |
| RC0 | PWM6 → ZSX11H PWM (control de velocidad) |
| RC1 | DIR → ZSX11H DIR (sentido de giro)       |
| RC4 | EUSART TX                                 |
| RC5 | EUSART RX                                 |
| RA2 | FVR 2.048V (alimentación potenciómetros)   |

### Configuracion

- **Clock:** 32 MHz (HFINTOSC)
- **ADC:** 10-bit, referencia VDD (5V) mediante `ADREF=0x00`
- **PWM6:** 31.25 kHz, 8-bit duty cycle
- **TMR0:** 16-bit, prescaler 1:256, ISR cada 8.33 ms (120 Hz)
- **UART:** 115200 baud, 8N1

### Protocolo de Comunicacion

**Telemetria (PIC → HMI):**

```
sp_deg,fb_deg,error,pwm_output,ctrlk_mv\r\n
```

| Campo        | Descripcion                            |
| ------------ | -------------------------------------- |
| `sp_deg`   | Setpoint en grados (0-360)             |
| `fb_deg`   | Feedback en grados (0-360)             |
| `error`    | Diferencia sp - fb (±360)              |
| `pwm_output` | Salida PID escalada (-255 a 255)     |
| `ctrlk_mv`   | Voltaje estimado en CTRLK (0-5000 mV) |

**Comandos (HMI → PIC):**

```
P<valor>\n     → Kp (0-200)
I<valor>\n     → Ki (0-100)
D<valor>\n     → Kd (0-100)
```

Ejemplo: `P50\n` establece Kp = 50

### Calibracion

Los potenciometros requieren calibracion para mapear los valores ADC a grados. El programa en `calibracion/main.c` determina los 4 valores de referencia:

```c
#define SP_ADC_0    4061  // ADC en 0° (invertido)
#define SP_ADC_360  0     // ADC en 360° (invertido)
#define FB_ADC_0    4057  // ADC en 0° (invertido)
#define FB_ADC_360  0     // ADC en 360° (invertido)
```

Ver `calibracion/README.md` para el procedimiento.

### PID

El controlador PID se ejecuta en la interrupcion de TMR0 a 120 Hz:

```
output = (Kp * error + Ki * integral + Kd * derivativo) / 100
```

- **Anti-windup:** Integral limitada a ±800 con integración condicional (solo acumula si output no saturado en la dirección del error)
- **Setpoint limits:** Recortado a [10°, 350°] para evitar inversión de giro en extremos
- **Direccion:** Pin DIR del ZSX11H, determinado por el signo de la salida
- **PWM:** Duty absoluto (0-255) enviado al pin PWM del ZSX11H
- **Rate limiting:** Cambio máximo de output = 100 por ciclo (~39% del rango)
- **Motor:** 57BLDC75E-20730 (brushless) controlado por el driver ZSX11H

## HMI (Dashboard Web)

Aplicacion React que se conecta al PIC via Web Serial API (Chrome/Edge).

### Requisitos

- Node.js 18+
- Google Chrome o Microsoft Edge (Web Serial API)

### Instalacion

```bash
cd HMI
npm install
```

### Ejecucion

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### Funcionalidades

- **Conexion serial:** Seleccion de puerto COM a 115200 baud
- **Grafica en tiempo real:** Setpoint y feedback vs tiempo (Chart.js)
- **Metricas:** Setpoint, feedback, error, PWM, sentido de giro (CW/CCW)
- **PID Tuner:** Sliders para ajustar Kp, Ki, Kd en tiempo real
- **Exportacion CSV:** Descarga automatica al desconectar con todos los datos de la sesion

### Formato CSV Exportado

```csv
Time_ms,Setpoint_Deg,Feedback_Deg,Error,PWM_Output
0.00,45,30,15,75
8.33,45,32,13,65
...
```

## Flujo de Uso

1. **Calibrar potenciometros:**

   - Programar `calibracion/calib_pote.c` en el PIC
   - Seguir instrucciones por terminal serial (115200 baud): girar cada pote a 0° y 360°
   - Copiar los 4 valores de calibracion en `main.c`
2. **Programar firmware:**

   - Compilar `main.c` con MPLAB X + XC8
   - Programar el PIC16F18426
3. **Iniciar HMI:**

   - `cd HMI && npm run dev`
   - Abrir en Chrome/Edge
   - Conectar al puerto serial del PIC
4. **Ajustar PID:**

   - Usar los sliders del PID Tuner
   - Observar respuesta en la grafica en tiempo real
   - Los cambios se envian con "Enviar Parametros"
5. **Exportar datos:**

   - Al desconectar, se descarga automaticamente un CSV con toda la sesion
