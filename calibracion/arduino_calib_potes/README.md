# Arduino - Calibracion de Potenciometros

## Uso

1. Conecta los potenciometros al Arduino:
   - SETPOINT -> A0
   - FEEDBACK -> A1
   - GND -> GND
   - VCC -> 5V (o 3.3V segun tu Arduino)

2. Abre `calibracion_potes.ino` en Arduino IDE

3. Selecciona el modo:
   - `#define MODO_CALIBRACION 1` -> Calibracion interactiva
   - `#define MODO_CALIBRACION 0` -> Monitor en vivo

4. Sube el sketch y abre el Monitor Serial a **115200 baud**

5. Sigue las instrucciones en pantalla (modo calibracion):
   - Gira SETPOINT a 0°, presiona cualquier tecla
   - Gira SETPOINT a 90°, presiona cualquier tecla
   - Gira FEEDBACK a 0°, presiona cualquier tecla
   - Gira FEEDBACK a 90°, presiona cualquier tecla
   - Copia los `#define` generados a `main.c` del proyecto PID

## Notas

- Los valores ADC son ratiometricos: si alimentas los potes desde
  la misma referencia que usa el ADC (ej. 5V + analogReference(DEFAULT)),
  los counts seran equivalentes a los del PIC con FVR 2.048V.
- Para el modo monitor, actualiza las constantes `SP_ADC_0`,
  `FB_ADC_0`, `SP_ADC_360`, `FB_ADC_360` con los valores obtenidos
  en la calibracion.
