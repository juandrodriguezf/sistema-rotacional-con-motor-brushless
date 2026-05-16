/**
  Calibration Main Source File

  Company:
    Microchip Technology Inc.

  File Name:
    main.c

  Summary:
    Calibration tool for SETPOINT and FEEDBACK potentiometers.
    Determines ADC values at 0 and 90 degrees, then extrapolates to 360°.

  Description:
    Interactive UART-based calibration program.
    User positions each potentiometer at 0° and 90° via serial input.
    The tool extrapolates the 360° value assuming a linear 1-turn pot.
    Final calibration constants are displayed for use in main.c PID code.

    Device            :  PIC16F18426
    UART              :  115200 baud
*/

#include "mcc_generated_files/mcc.h"
#include <stdint.h>

#define AVG_SAMPLES   16

static uint16_t read_avg(adcc_channel_t ch)
{
    uint32_t sum = 0;
    for (uint8_t i = 0; i < AVG_SAMPLES; i++) {
        sum += ADCC_GetSingleConversion(ch);
    }
    return (uint16_t)(sum / AVG_SAMPLES);
}

static void uart_print(const char *str)
{
    while (*str) {
        while (!EUSART1_is_tx_ready());
        EUSART1_Write(*str++);
    }
}

static void uart_print_u16(uint16_t val)
{
    char buf[6];
    uint8_t i = 5;
    buf[i] = '\0';
    if (val == 0) {
        buf[--i] = '0';
    } else {
        while (val > 0 && i > 0) {
            buf[--i] = (val % 10) + '0';
            val /= 10;
        }
    }
    uart_print(&buf[i]);
}

static void uart_print_i32(int32_t val)
{
    if (val < 0) {
        uart_print("-");
        val = -val;
    }
    char buf[12];
    uint8_t i = 11;
    buf[i] = '\0';
    if (val == 0) {
        buf[--i] = '0';
    } else {
        while (val > 0 && i > 0) {
            buf[--i] = (val % 10) + '0';
            val /= 10;
        }
    }
    uart_print(&buf[i]);
}

static void uart_wait_key(void)
{
    while (!EUSART1_is_rx_ready());
    EUSART1_Read();
}

void main(void)
{
    SYSTEM_Initialize();
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    uart_print("\r\n=== CALIBRACION DE POTENCIOMETROS ===\r\n\r\n");

    uart_print("Paso 1: Gire el pote SETPOINT a 0 grados.\r\n");
    uart_print("Presione cualquier tecla para capturar...\r\n");
    uart_wait_key();
    uint16_t sp_0 = read_avg(SETPOINT);
    uart_print("  SETPOINT 0 deg = ");
    uart_print_u16(sp_0);
    uart_print("\r\n\r\n");

    uart_print("Paso 2: Gire el pote SETPOINT a 90 grados.\r\n");
    uart_print("Presione cualquier tecla para capturar...\r\n");
    uart_wait_key();
    uint16_t sp_90 = read_avg(SETPOINT);
    uart_print("  SETPOINT 90 deg = ");
    uart_print_u16(sp_90);
    uart_print("\r\n\r\n");

    uart_print("Paso 3: Gire el pote FEEDBACK a 0 grados.\r\n");
    uart_print("Presione cualquier tecla para capturar...\r\n");
    uart_wait_key();
    uint16_t fb_0 = read_avg(FEEDBACK);
    uart_print("  FEEDBACK 0 deg = ");
    uart_print_u16(fb_0);
    uart_print("\r\n\r\n");

    uart_print("Paso 4: Gire el pote FEEDBACK a 90 grados.\r\n");
    uart_print("Presione cualquier tecla para capturar...\r\n");
    uart_wait_key();
    uint16_t fb_90 = read_avg(FEEDBACK);
    uart_print("  FEEDBACK 90 deg = ");
    uart_print_u16(fb_90);
    uart_print("\r\n\r\n");

    uart_print("=== RESULTADOS DE CALIBRACION ===\r\n\r\n");

    uart_print("Copie estos valores en main.c:\r\n\r\n");

    uart_print("#define SP_ADC_0    ");
    uart_print_u16(sp_0);
    uart_print("\r\n");

    uart_print("#define FB_ADC_0    ");
    uart_print_u16(fb_0);
    uart_print("\r\n\r\n");

    int32_t sp_range_90 = (int32_t)sp_90 - (int32_t)sp_0;
    int32_t fb_range_90 = (int32_t)fb_90 - (int32_t)fb_0;

    int32_t sp_360 = (int32_t)sp_0 + sp_range_90 * 4;
    int32_t fb_360 = (int32_t)fb_0 + fb_range_90 * 4;

    uart_print("#define SP_ADC_360  ");
    uart_print_i32(sp_360);
    uart_print("\r\n");

    uart_print("#define FB_ADC_360  ");
    uart_print_i32(fb_360);
    uart_print("\r\n\r\n");

    uart_print("=== RANGO DETECTADO ===\r\n\r\n");

    uart_print("SETPOINT 90 deg: ");
    uart_print_u16(sp_range_90 < 0 ? (uint16_t)(-sp_range_90) : (uint16_t)sp_range_90);
    uart_print(" counts (");
    if (sp_range_90 < 0) uart_print("invertido"); else uart_print("normal");
    uart_print(")\r\n");

    uart_print("FEEDBACK 90 deg: ");
    uart_print_u16(fb_range_90 < 0 ? (uint16_t)(-fb_range_90) : (uint16_t)fb_range_90);
    uart_print(" counts (");
    if (fb_range_90 < 0) uart_print("invertido"); else uart_print("normal");
    uart_print(")\r\n\r\n");

    uart_print("Formula para convertir ADC a grados:\r\n");
    uart_print("  grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)\r\n\r\n");

    uart_print("=== FIN ===\r\n");

    while (1) {
    }
}
