# Calibracion de Potenciometros

## Uso

1. Copie los archivos de `mcc_generated_files/` desde el proyecto principal a esta carpeta (o compile con la misma configuracion MCC).
2. Programe el PIC con este `calib_pote.c`.
3. Abra un terminal serial a 115200 baud.
4. Siga las instrucciones paso a paso:
   - Posicione cada potenciómetro en 0° y presione una tecla.
   - Posicione cada potenciómetro en 90° y presione una tecla.
5. Al final, el programa muestra los valores de calibración para copiar en `main.c` del proyecto PID.

## Valores generados

```c
#define SP_ADC_0    <valor>
#define SP_ADC_90   <valor>
#define FB_ADC_0    <valor>
#define FB_ADC_90   <valor>
```

## Conversion ADC a grados

```c
grados = (adc_raw - ADC_0) * 90 / (ADC_90 - ADC_0)
```
