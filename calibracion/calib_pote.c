/**
  Calibracion de potenciometros

  Mide valores ADC en 0° (minimo) y 360° (maximo) directamente.
  Usa VDD (5V) como referencia del ADC.

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

static void uart_wait_key(void)
{
    while (!EUSART1_is_rx_ready());
    EUSART1_Read();
}

void main(void)
{
    SYSTEM_Initialize();
    ADREF = 0x00;
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    uart_print("\r\n=== CALIBRACION DE POTENCIOMETROS ===\r\n\r\n");
    uart_print("Gire cada pote al minimo (0 grados) y al\r\n");
    uart_print("maximo (360 grados) cuando se le indique.\r\n");
    uart_print("Luego presione cualquier tecla.\r\n\r\n");

    // --- SETPOINT 0° ---
    uart_print("Paso 1: Gire SETPOINT a 0 grados (minimo).\r\n");
    uart_print("Presione cualquier tecla...\r\n");
    uart_wait_key();
    uint16_t sp_0 = read_avg(SETPOINT);
    uart_print("  SETPOINT 0 deg (ADC) = ");
    uart_print_u16(sp_0);
    uart_print("\r\n\r\n");

    // --- SETPOINT 360° ---
    uart_print("Paso 2: Gire SETPOINT a 360 grados (maximo).\r\n");
    uart_print("Presione cualquier tecla...\r\n");
    uart_wait_key();
    uint16_t sp_360 = read_avg(SETPOINT);
    uart_print("  SETPOINT 360 deg (ADC) = ");
    uart_print_u16(sp_360);
    uart_print("\r\n\r\n");

    // --- FEEDBACK 0° ---
    uart_print("Paso 3: Gire FEEDBACK a 0 grados (minimo).\r\n");
    uart_print("Presione cualquier tecla...\r\n");
    uart_wait_key();
    uint16_t fb_0 = read_avg(FEEDBACK);
    uart_print("  FEEDBACK 0 deg (ADC) = ");
    uart_print_u16(fb_0);
    uart_print("\r\n\r\n");

    // --- FEEDBACK 360° ---
    uart_print("Paso 4: Gire FEEDBACK a 360 grados (maximo).\r\n");
    uart_print("Presione cualquier tecla...\r\n");
    uart_wait_key();
    uint16_t fb_360 = read_avg(FEEDBACK);
    uart_print("  FEEDBACK 360 deg (ADC) = ");
    uart_print_u16(fb_360);
    uart_print("\r\n\r\n");

    // --- RESULTADOS ---
    uart_print("=== RESULTADOS DE CALIBRACION ===\r\n\r\n");
    uart_print("Copie estos valores en main.c:\r\n\r\n");

    uart_print("#define SP_ADC_0    ");
    uart_print_u16(sp_0);
    uart_print("\r\n");

    uart_print("#define FB_ADC_0    ");
    uart_print_u16(fb_0);
    uart_print("\r\n\r\n");

    uart_print("#define SP_ADC_360  ");
    uart_print_u16(sp_360);
    uart_print("\r\n");

    uart_print("#define FB_ADC_360  ");
    uart_print_u16(fb_360);
    uart_print("\r\n\r\n");

    // --- RANGO ---
    uint16_t sp_delta = (sp_360 > sp_0) ? (sp_360 - sp_0) : (sp_0 - sp_360);
    uint16_t fb_delta = (fb_360 > fb_0) ? (fb_360 - fb_0) : (fb_0 - fb_360);

    uart_print("=== RANGO DETECTADO ===\r\n\r\n");

    uart_print("SETPOINT rango: ");
    uart_print_u16(sp_delta);
    uart_print(" counts (");
    uart_print(sp_360 > sp_0 ? "normal" : "INVERTIDO");
    uart_print(")\r\n");

    uart_print("FEEDBACK rango: ");
    uart_print_u16(fb_delta);
    uart_print(" counts (");
    uart_print(fb_360 > fb_0 ? "normal" : "INVERTIDO");
    uart_print(")\r\n\r\n");

    uart_print("Formula: grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)\r\n\r\n");

    uart_print("=== CALIBRACION COMPLETADA ===\r\n\r\n");
    uart_print("Enviando posicion de potes en vivo...\r\n");
    uart_print("Formato: ADC_SP,ADC_FB,DEG_SP,DEG_FB\r\n\r\n");

    // --- MONITOREO CONTINUO ---
    while (1) {
        uint16_t adc_sp = read_avg(SETPOINT);
        uint16_t adc_fb = read_avg(FEEDBACK);

        int16_t sp_range = (int16_t)(sp_360 - sp_0);
        int16_t fb_range = (int16_t)(fb_360 - fb_0);

        int16_t deg_sp = 0;
        int16_t deg_fb = 0;

        if (sp_range != 0)
            deg_sp = (int16_t)(((int32_t)adc_sp - (int32_t)sp_0) * 360L / sp_range);
        if (fb_range != 0)
            deg_fb = (int16_t)(((int32_t)adc_fb - (int32_t)fb_0) * 360L / fb_range);

        if (deg_sp < 0) deg_sp = 0;
        if (deg_sp > 360) deg_sp = 360;
        if (deg_fb < 0) deg_fb = 0;
        if (deg_fb > 360) deg_fb = 360;

        uart_print_u16(adc_sp);
        uart_print(",");
        uart_print_u16(adc_fb);
        uart_print(",");
        {
            int16_t d = deg_sp;
            if (d < 0) { uart_print("-"); d = -d; }
            uart_print_u16((uint16_t)d);
        }
        uart_print(",");
        {
            int16_t d = deg_fb;
            if (d < 0) { uart_print("-"); d = -d; }
            uart_print_u16((uint16_t)d);
        }
        uart_print("\r\n");

        for (volatile uint32_t d = 0; d < 8000; d++);
    }
}
