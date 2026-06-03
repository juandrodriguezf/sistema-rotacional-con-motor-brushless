/**
  motor_dir.c — Control de direccion standalone para PIC16F18426
  Uso:
    Compilar como proyecto independiente en MPLAB X (mismo MCC).
    Conectar UART a 115200 baud.
    Comandos:  F0  → reversa
               F1  → adelante
               T   → toggle
    GPIO: RC1 = DIR (LATC1), PWM6 en pin correspondiente
    NOTA: El motor necesita PWM para moverse. Este codigo aplica
          un duty fijo de prueba (PWM_DUTY_TEST) al recibir comando.
*/

#include "mcc_generated_files/mcc.h"
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>

#define RX_BUF_SIZE     16
#define PWM_DUTY_TEST   200   // duty fijo de prueba (0-255 aprox)

static char rx_buf[RX_BUF_SIZE];
static uint8_t rx_idx = 0;

static void process_command(char *cmd)
{
    switch (cmd[0]) {
        case 'F':
        case 'f': {
            int16_t val = (int16_t)atoi(&cmd[1]);
            if (val == 0) {
                DIR_SetLow();
            } else {
                DIR_SetHigh();
            }
            PWM6_LoadDutyValue(PWM_DUTY_TEST);
            break;
        }
        case 'T':
        case 't':
            DIR_Toggle();
            PWM6_LoadDutyValue(PWM_DUTY_TEST);
            break;
        case '0':
            PWM6_LoadDutyValue(0);   // apagar motor
            break;
    }
}

void main(void)
{
    SYSTEM_Initialize();
    ADREF = 0x00;
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    DIR_SetHigh();               // direccion inicial = adelante
    PWM6_LoadDutyValue(0);       // motor apagado al iniciar

    while (1) {
        while (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();

            if (c == '\n' || c == '\r') {
                if (rx_idx > 0) {
                    rx_buf[rx_idx] = '\0';
                    process_command(rx_buf);
                    rx_idx = 0;
                }
            } else {
                if (rx_idx < RX_BUF_SIZE - 1) {
                    rx_buf[rx_idx++] = c;
                }
            }
        }
    }
}
