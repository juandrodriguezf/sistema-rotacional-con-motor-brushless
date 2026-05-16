/**
  Generated Main Source File

  Company:
    Microchip Technology Inc.

  File Name:
    main.c

  Summary:
    This is the main file generated using PIC10 / PIC12 / PIC16 / PIC18 MCUs

  Description:
    This header file provides implementations for driver APIs for all modules selected in the GUI.
    Generation Information :
        Product Revision  :  PIC10 / PIC12 / PIC16 / PIC18 MCUs - 1.81.8
        Device            :  PIC16F18426
        Driver Version    :  2.00
*/

/*
    (c) 2018 Microchip Technology Inc. and its subsidiaries. 
    
    Subject to your compliance with these terms, you may use Microchip software and any 
    derivatives exclusively with Microchip products. It is your responsibility to comply with third party 
    license terms applicable to your use of third party software (including open source software) that 
    may accompany Microchip software.
    
    THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER 
    EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY 
    IMPLIED WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS 
    FOR A PARTICULAR PURPOSE.
    
    IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE, 
    INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND 
    WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP 
    HAS BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO 
    THE FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL 
    CLAIMS IN ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT 
    OF FEES, IF ANY, THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS 
    SOFTWARE.
*/

#include "mcc_generated_files/mcc.h"
#include <stdlib.h>

#define FVR_VOLTAGE     2048
#define ADC_MAX         1023

#define SP_ADC_0    0
#define SP_ADC_90   1023
#define FB_ADC_0    0
#define FB_ADC_90   1023

#define PWM_MAX         255

// --- PARÁMETROS PID DINÁMICOS (Modificables vía HMI) ---
volatile int16_t kp_val = 50;
volatile int16_t ki_val = 10;
volatile int16_t kd_val = 0;

#define INTEGRAL_MAX    5000
#define INTEGRAL_MIN    -5000

#define CSV_BUFFER_SIZE 64
#define RX_BUFFER_SIZE  16

static int16_t adc_to_degrees(uint16_t adc_raw, int16_t adc_0, int16_t adc_90)
{
    int32_t range = (int32_t)adc_90 - (int32_t)adc_0;
    if (range == 0) return 0;
    return (int16_t)((int32_t)((int16_t)adc_raw - adc_0) * 90 / range);
}

static int32_t integral = 0;
static int16_t prev_error = 0;

static int16_t tel_setpoint_deg = 0;
static int16_t tel_feedback_deg = 0;
static int16_t tel_error = 0;
static int16_t tel_output = 0;
static volatile bool tel_ready = false;

static void PID_ISR(void)
{
    uint16_t sp_raw = ADCC_GetSingleConversion(SETPOINT);
    uint16_t fb_raw = ADCC_GetSingleConversion(FEEDBACK);

    int16_t sp_deg = adc_to_degrees(sp_raw, SP_ADC_0, SP_ADC_90);
    int16_t fb_deg = adc_to_degrees(fb_raw, FB_ADC_0, FB_ADC_90);

    int16_t error = sp_deg - fb_deg;

    integral += error;
    if (integral > INTEGRAL_MAX) integral = INTEGRAL_MAX;
    if (integral < INTEGRAL_MIN) integral = INTEGRAL_MIN;

    int16_t derivative = error - prev_error;
    prev_error = error;

    // Uso de variables dinámicas kp_val, ki_val, kd_val
    int32_t output = (int32_t)kp_val * error + (int32_t)ki_val * integral + (int32_t)kd_val * derivative;

    int32_t scaled = output / 100;

    if (scaled > PWM_MAX) scaled = PWM_MAX;
    if (scaled < -PWM_MAX) scaled = -PWM_MAX;

    int16_t duty = (int16_t)scaled;

    if (duty < 0) {
        DIR_SetLow();
        duty = -duty;
    } else {
        DIR_SetHigh();
    }

    if (duty > PWM_MAX) duty = PWM_MAX;

    PWM6_LoadDutyValue((uint16_t)duty);

    tel_setpoint_deg = sp_deg;
    tel_feedback_deg = fb_deg;
    tel_error = error;
    tel_output = (int16_t)scaled;
    tel_ready = true;
}

static void int_to_str(int16_t val, char *buf, uint8_t buf_size)
{
    uint8_t i = 0;
    uint8_t start = 0;

    if (val < 0) {
        buf[i++] = '-';
        val = -val;
        start = 1;
    }

    uint8_t digits[6];
    uint8_t count = 0;

    if (val == 0) {
        digits[count++] = 0;
    } else {
        while (val > 0 && count < 6) {
            digits[count++] = val % 10;
            val /= 10;
        }
    }

    for (uint8_t j = 0; j < count; j++) {
        buf[i++] = digits[count - 1 - j] + '0';
    }

    buf[i] = '\0';
}

static void send_csv(void)
{
    char buf[CSV_BUFFER_SIZE];
    uint8_t len = 0;

    char tmp[8];

    int_to_str(tel_setpoint_deg, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) buf[len++] = tmp[i];
    buf[len++] = ',';

    int_to_str(tel_feedback_deg, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) buf[len++] = tmp[i];
    buf[len++] = ',';

    int_to_str(tel_error, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) buf[len++] = tmp[i];
    buf[len++] = ',';

    int_to_str(tel_output, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) buf[len++] = tmp[i];

    buf[len++] = '\r';
    buf[len++] = '\n';

    for (uint8_t i = 0; i < len; i++) {
        while (!EUSART1_is_tx_ready());
        EUSART1_Write(buf[i]);
    }
}

// --- PROCESAMIENTO DE COMANDOS HMI ---
// Comandos: "P100\n", "I5\n", "D1\n"
void ProcessHmiCommand(char *cmd)
{
    char type = cmd[0];
    int16_t val = (int16_t)atoi(&cmd[1]);

    switch(type) {
        case 'P': kp_val = val; break;
        case 'I': ki_val = val; break;
        case 'D': kd_val = val; break;
        default: break;
    }
}

/*
                         Main application
 */
void main(void)
{
    SYSTEM_Initialize();

    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    TMR0_SetInterruptHandler(PID_ISR);

    char rx_buffer[RX_BUFFER_SIZE];
    uint8_t rx_idx = 0;

    while (1)
    {
        // 1. Telemetría hacia el HMI
        if (tel_ready) {
            tel_ready = false;
            send_csv();
        }

        // 2. Recepción de comandos desde el HMI
        if (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();
            
            // Detectar fin de línea
            if (c == '\n' || c == '\r') {
                if (rx_idx > 0) {
                    rx_buffer[rx_idx] = '\0';
                    ProcessHmiCommand(rx_buffer);
                    rx_idx = 0;
                }
            } else {
                // Agregar al buffer si hay espacio
                if (rx_idx < (RX_BUFFER_SIZE - 1)) {
                    rx_buffer[rx_idx++] = c;
                }
            }
        }
    }
}
/**
  End of File
*/
