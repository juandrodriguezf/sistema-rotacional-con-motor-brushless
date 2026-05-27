/**
  Test PWM - Prueba de rangos del motor

  Control manual del PWM y direccion via UART.
  Ideal para encontrar el duty minimo de arranque,
  rango util, deadband y linealidad.

  Conexiones:
    RC0 -> PWM6OUT -> driver ZSX11H (CTRL)
    RC1 -> DIR -> driver ZSX11H

  Comandos UART (115200 baud):
    P<0-1023>   PWM fijo
    R           Rampa CW 0->1023
    Q           Rampa CCW 1023->0
    D           Toggle direccion
    D<0|1>      Direccion (0=CCW, 1=CW)
    S           Stop (PWM=0)
    ?           Estado

  Device: PIC16F18426
*/

#include "mcc_generated_files/mcc.h"
#include <stdint.h>
#include <stdlib.h>

#define RX_BUFFER_SIZE  16

static uint8_t dir_state = 1;

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

static void set_pwm(uint16_t duty)
{
    if (duty > 1023) duty = 1023;
    PWM6_LoadDutyValue(duty);
    if (dir_state) DIR_SetHigh(); else DIR_SetLow();
}

static void set_dir(uint8_t d)
{
    dir_state = d;
    if (dir_state) DIR_SetHigh(); else DIR_SetLow();
}

void main(void)
{
    SYSTEM_Initialize();
    ADREF = 0x00;
    T2CON = 0xA0;
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    uart_print("\r\n=== TEST PWM ===\r\n");
    uart_print("Comandos:\r\n");
    uart_print("  P<0-1023>  PWM fijo\r\n");
    uart_print("  R          Rampa CW 0->1023\r\n");
    uart_print("  Q          Rampa CCW 1023->0\r\n");
    uart_print("  D          Toggle direccion\r\n");
    uart_print("  D<0|1>     Direccion (0=CCW, 1=CW)\r\n");
    uart_print("  S          Stop (PWM=0)\r\n");
    uart_print("  ?          Estado\r\n\r\n");

    char buf[RX_BUFFER_SIZE];
    uint8_t idx = 0;

    while (1) {
        if (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();
            if (c == '\n' || c == '\r') {
                if (idx == 0) continue;
                buf[idx] = '\0';

                char cmd = buf[0];
                int16_t val = (int16_t)atoi(&buf[1]);

                if (cmd == 'P') {
                    if (val >= 0 && val <= 1023) {
                        set_pwm((uint16_t)val);
                        uart_print("PWM="); uart_print_u16(val);
                        uart_print(" DIR="); uart_print(dir_state ? "CW" : "CCW");
                        uart_print("\r\n");
                    }
                } else if (cmd == 'D') {
                    if (buf[1] == '0') set_dir(0);
                    else if (buf[1] == '1') set_dir(1);
                    else set_dir(!dir_state);
                    uart_print("DIR="); uart_print(dir_state ? "CW" : "CCW"); uart_print("\r\n");
                } else if (cmd == 'S') {
                    set_pwm(0);
                    uart_print("STOP\r\n");
                } else if (cmd == 'R') {
                    set_dir(1);
                    uart_print("Rampa CW 0->1023\r\n");
                    for (uint16_t d = 0; d <= 1023; d += 10) {
                        set_pwm(d);
                        uart_print_u16(d); uart_print("\r\n");
                        for (volatile uint32_t t = 0; t < 200000; t++);
                        if (EUSART1_is_rx_ready()) {
                            EUSART1_Read();
                            uart_print("Abortada\r\n");
                            break;
                        }
                    }
                    set_pwm(0);
                    uart_print("Rampa fin\r\n");
                } else if (cmd == 'Q') {
                    set_dir(0);
                    uart_print("Rampa CCW 1023->0\r\n");
                    for (int16_t d = 1023; d >= 0; d -= 10) {
                        set_pwm((uint16_t)d);
                        uart_print_u16(d); uart_print("\r\n");
                        for (volatile uint32_t t = 0; t < 200000; t++);
                        if (EUSART1_is_rx_ready()) {
                            EUSART1_Read();
                            uart_print("Abortada\r\n");
                            break;
                        }
                    }
                    set_pwm(0);
                    uart_print("Rampa fin\r\n");
                } else if (cmd == '?') {
                    uart_print("PWM=");
                    uart_print_u16(0);
                    uart_print(" DIR=");
                    uart_print(dir_state ? "CW" : "CCW");
                    uart_print("\r\n");
                }

                idx = 0;
            } else {
                if (idx < (RX_BUFFER_SIZE - 1)) buf[idx++] = c;
            }
        }
    }
}
