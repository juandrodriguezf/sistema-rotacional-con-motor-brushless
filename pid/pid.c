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

#define VDD_MV          5000

#define SP_ADC_0    4061
#define SP_ADC_360  0
#define FB_ADC_0    4057
#define FB_ADC_360  0

#define PWM_MAX         120

#define PID_SCALE       100
#define KP_MAX          200
#define KI_MAX          100
#define KD_MAX          100

#define OUTPUT_MAX_DELTA 100
#define DIR_HYSTERESIS   10

#define SP_MIN_DEG      10
#define SP_MAX_DEG      350

#define INTEGRAL_MAX    800
#define INTEGRAL_MIN    -800

#define ERROR_DEADBAND   2
#define PWM_MIN          40

#define CSV_BUFFER_SIZE 64
#define RX_BUFFER_SIZE  32

volatile int16_t kp_val = 30;
volatile int16_t ki_val = 10;
volatile int16_t kd_val = 0;

static int32_t integral = 0;
static int16_t prev_error = 0;
static int32_t prev_scaled = 0;
static int16_t prev_fb_deg = 0;
static int16_t prev_duty_sign = 0;
static int16_t pending_duty_sign = 0;
static int16_t last_dir = 0;
static bool dir_change_pending = false;

static volatile int16_t tel_setpoint_deg = 0;
static volatile int16_t tel_feedback_deg = 0;
static volatile int16_t tel_error = 0;
static volatile int16_t tel_output = 0;
static volatile int16_t tel_ctrlk_mv = 0;
static volatile bool tel_ready = false;

static int16_t adc_to_degrees(uint16_t adc_raw, int16_t adc_0, int16_t adc_360)
{
    int32_t range = (int32_t)adc_360 - (int32_t)adc_0;
    if (range == 0) return 0;
    return (int16_t)((int32_t)((int16_t)adc_raw - adc_0) * 360 / range);
}

static void PID_ISR(void)
{
    int16_t kp, ki, kd;
    kp = kp_val;
    ki = ki_val;
    kd = kd_val;

    uint16_t sp_raw = ADCC_GetSingleConversion(SETPOINT);
    uint16_t fb_raw = ADCC_GetSingleConversion(FEEDBACK);

    int16_t sp_deg = adc_to_degrees(sp_raw, SP_ADC_0, SP_ADC_360);
    int16_t fb_deg = adc_to_degrees(fb_raw, FB_ADC_0, FB_ADC_360);

    if (sp_deg < SP_MIN_DEG) sp_deg = SP_MIN_DEG;
    if (sp_deg > SP_MAX_DEG) sp_deg = SP_MAX_DEG;

    int16_t error = sp_deg - fb_deg;

    if (error > -ERROR_DEADBAND && error < ERROR_DEADBAND) {
        integral = 0;
        prev_fb_deg = fb_deg;
        prev_error = error;
        dir_change_pending = false;
        PWM6_LoadDutyValue(0);
        tel_setpoint_deg = sp_deg;
        tel_feedback_deg = fb_deg;
        tel_error = error;
        tel_output = 0;
        tel_ctrlk_mv = 0;
        tel_ready = true;
        return;
    }

    int16_t derivative = -(fb_deg - prev_fb_deg);
    prev_fb_deg = fb_deg;
    prev_error = error;

    int32_t output = (int32_t)kp * error + (int32_t)ki * integral + (int32_t)kd * derivative;
    int32_t scaled = output / PID_SCALE;

    int32_t delta = scaled - prev_scaled;
    if (delta > OUTPUT_MAX_DELTA) scaled = prev_scaled + OUTPUT_MAX_DELTA;
    else if (delta < -OUTPUT_MAX_DELTA) scaled = prev_scaled - OUTPUT_MAX_DELTA;

    if (scaled > PWM_MAX) scaled = PWM_MAX;
    if (scaled < -PWM_MAX) scaled = -PWM_MAX;

    int16_t duty_abs = (scaled > 0) ? (int16_t)scaled : (int16_t)(-scaled);
    int16_t duty_sign = (scaled > DIR_HYSTERESIS) ? 1 :
                        (scaled < -DIR_HYSTERESIS) ? -1 : 0;

    if (!((scaled >= PWM_MAX && error > 0) || (scaled <= -PWM_MAX && error < 0))) {
        integral += error;
        if (integral > INTEGRAL_MAX) integral = INTEGRAL_MAX;
        if (integral < INTEGRAL_MIN) integral = INTEGRAL_MIN;
    }

    prev_scaled = scaled;

    if (dir_change_pending) {
        if (pending_duty_sign > 0) DIR_SetHigh();
        else if (pending_duty_sign < 0) DIR_SetLow();
        dir_change_pending = false;
    } else if (duty_sign != 0 && last_dir != 0 && duty_sign != last_dir) {
        PWM6_LoadDutyValue(0);
        dir_change_pending = true;
        pending_duty_sign = duty_sign;
        prev_duty_sign = 0;

        tel_setpoint_deg = sp_deg;
        tel_feedback_deg = fb_deg;
        tel_error = error;
        tel_output = 0;
        tel_ctrlk_mv = 0;
        tel_ready = true;
        return;
    }

    prev_duty_sign = duty_sign;
    if (duty_sign != 0) last_dir = duty_sign;

    int16_t duty = (int16_t)scaled;
    if (duty < 0) {
        duty = -duty;
    }
    if (duty > 0 && duty < PWM_MIN) {
        duty = PWM_MIN;
    }

    PWM6_LoadDutyValue((uint16_t)duty);

    tel_setpoint_deg = sp_deg;
    tel_feedback_deg = fb_deg;
    tel_error = error;
    tel_output = (int16_t)scaled;
    tel_ctrlk_mv = (int16_t)(((int32_t)duty * VDD_MV) / PWM_MAX);
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

static char tx_buf[CSV_BUFFER_SIZE];
static uint8_t tx_len = 0;
static uint8_t tx_idx = 0;

static void csv_prepare(void)
{
    uint8_t len = 0;
    char tmp[8];

    int_to_str(tel_setpoint_deg, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) tx_buf[len++] = tmp[i];
    tx_buf[len++] = ',';

    int_to_str(tel_feedback_deg, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) tx_buf[len++] = tmp[i];
    tx_buf[len++] = ',';

    int_to_str(tel_error, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) tx_buf[len++] = tmp[i];
    tx_buf[len++] = ',';

    int_to_str(tel_output, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) tx_buf[len++] = tmp[i];
    tx_buf[len++] = ',';

    int_to_str(tel_ctrlk_mv, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i] != '\0'; i++) tx_buf[len++] = tmp[i];

    tx_buf[len++] = '\r';
    tx_buf[len++] = '\n';

    tx_len = len;
    tx_idx = 0;
}

void ProcessHmiCommand(char *cmd)
{
    char type = cmd[0];
    int16_t val = (int16_t)atoi(&cmd[1]);

    INTCONbits.GIE = 0;
    switch(type) {
        case 'P': if (val >= 0 && val <= KP_MAX) kp_val = val; break;
        case 'I': if (val >= 0 && val <= KI_MAX) ki_val = val; break;
        case 'D': if (val >= 0 && val <= KD_MAX) kd_val = val; break;
        default: break;
    }
    INTCONbits.GIE = 1;
}

/*
                         Main application
 */
void main(void)
{
    SYSTEM_Initialize();
    ADREF = 0x00;
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    TMR0_SetInterruptHandler(PID_ISR);

    char rx_buffer[RX_BUFFER_SIZE];
    uint8_t rx_idx = 0;
    uint8_t rx_silence = 0;

    while (1)
    {
        while (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();
            rx_silence = 0;
            
            if (c == '\n' || c == '\r') {
                if (rx_idx > 0) {
                    rx_buffer[rx_idx] = '\0';
                    ProcessHmiCommand(rx_buffer);
                    rx_idx = 0;
                }
            } else {
                if (rx_idx < (RX_BUFFER_SIZE - 1)) {
                    rx_buffer[rx_idx++] = c;
                }
            }
        }

        if (rx_idx > 0) {
            rx_silence++;
            if (rx_silence > 6) {
                rx_idx = 0;
                rx_silence = 0;
            }
        }

        if (tel_ready) {
            tel_ready = false;
            csv_prepare();
        }

        if (tx_idx < tx_len) {
            if (EUSART1_is_tx_ready()) {
                EUSART1_Write(tx_buf[tx_idx++]);
            }
        }
    }
}
/**
  End of File
*/
