# Calibracion de Potenciometros

## Uso

1. Copie los archivos de `mcc_generated_files/` desde el proyecto principal a esta carpeta (o compile con la misma configuracion MCC).
2. Programe el PIC con `calib_pote.c`.
3. Abra un terminal serial a 115200 baud.
4. Siga las instrucciones paso a paso:
   - Gire SETPOINT a **0° (minimo)** y presione una tecla.
   - Gire SETPOINT a **360° (maximo)** y presione una tecla.
   - Gire FEEDBACK a **0° (minimo)** y presione una tecla.
   - Gire FEEDBACK a **360° (maximo)** y presione una tecla.
5. Al final, el programa muestra los valores de calibración y entra en modo **monitoreo en vivo**:
   ```
   ADC_SP,ADC_FB,DEG_SP,DEG_FB\r\n
   ```

## Valores generados

```c
#define SP_ADC_0    <valor>
#define SP_ADC_360  <valor>
#define FB_ADC_0    <valor>
#define FB_ADC_360  <valor>
```

## Conversion ADC a grados

```c
grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)
```

## Notas

- Los potenciómetros pueden estar **invertidos** (ADC mayor en 0° que en 360°). El programa lo detecta y muestra "INVERTIDO" en la salida.
- El modo de monitoreo en vivo permite verificar visualmente que la conversión a grados sea correcta antes de copiar los valores al firmware PID.
- La referencia del ADC es VDD (5V), no FVR.
