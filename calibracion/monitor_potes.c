/**
  Potentiometer Serial Monitor

  Reads SETPOINT and FEEDBACK potentiometers continuously and outputs
  raw ADC values + converted degrees over UART in CSV format.

  Use with any serial terminal at 115200 baud to verify:
    - Potentiometer wiring (both channels respond)
    - ADC range (min/max values while turning)
    - Smoothness (noise level, stuck bits)
    - Mechanical range (does it cover full 0-360 degrees?)

  Output format:
    ADC_SP,ADC_FB,DEG_SP,DEG_FB

  Before compiling, set SP_ADC_0/FB_ADC_0/SP_ADC_360/FB_ADC_360
  to the values obtained from the calib_pote tool.
  Defaults below assume 10-bit ADC (0-1023) scaled to 0-360 deg.

  Device            :  PIC16F18426
  UART              :  115200 baud
  Sample rate       :  ~50 Hz (limited by software delay)
*/

#include "mcc_generated_files/mcc.h"
#include <stdint.h>

// --- CALIBRATION CONSTANTS (replace with calib_pote results) ---
#define SP_ADC_0    0
#define FB_ADC_0    0
#define SP_ADC_360  1023
#define FB_ADC_360  1023
// ----------------------------------------------------------------

#define AVG_SAMPLES  8

static uint16_t read_avg(adcc_channel_t ch)
{
    uint32_t sum = 0;
    for (uint8_t i = 0; i < AVG_SAMPLES; i++) {
        sum += ADCC_GetSingleConversion(ch);
    }
    return (uint16_t)(sum / AVG_SAMPLES);
}

static int16_t adc_to_deg(uint16_t raw, uint16_t adc_0, uint16_t adc_360)
{
    int32_t range = (int32_t)adc_360 - (int32_t)adc_0;
    if (range == 0) return 0;
    int32_t deg = ((int32_t)raw - (int32_t)adc_0) * 360L / range;
    if (deg < 0) deg = 0;
    if (deg > 360) deg = 360;
    return (int16_t)deg;
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

static void uart_print_i16(int16_t val)
{
    if (val < 0) {
        uart_print("-");
        val = -val;
    }
    uart_print_u16((uint16_t)val);
}

static void delay_ms(uint16_t ms)
{
    for (uint16_t i = 0; i < ms; i++) {
        __delay_ms(1);
    }
}

void main(void)
{
    SYSTEM_Initialize();
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    uart_print("\r\n=== MONITOR DE POTENCIOMETROS ===\r\n");
    uart_print("Gire los potenciometros y observe los valores.\r\n");
    uart_print("Formato: ADC_SP,ADC_FB,DEG_SP,DEG_FB\r\n\r\n");
    delay_ms(500);

    while (1) {
        uint16_t adc_sp = read_avg(SETPOINT);
        uint16_t adc_fb = read_avg(FEEDBACK);

        int16_t deg_sp = adc_to_deg(adc_sp, SP_ADC_0, SP_ADC_360);
        int16_t deg_fb = adc_to_deg(adc_fb, FB_ADC_0, FB_ADC_360);

        uart_print_u16(adc_sp);
        uart_print(",");
        uart_print_u16(adc_fb);
        uart_print(",");
        uart_print_i16(deg_sp);
        uart_print(",");
        uart_print_i16(deg_fb);
        uart_print("\r\n");

        delay_ms(20);
    }
}
