
// ============================================================
// CALIBRACION DE POTENCIOMETROS - ARDUINO
//
// Compatible con proyecto m3.X (PIC16F18426 + HMI React)
// Dos modos: CALIBRACION interactiva y MONITOR en vivo
// ============================================================
//
// CONEXIONES:
//   SETPOINT  -> A0
//   FEEDBACK  -> A1
//   GND       -> GND
//   (Alimentar los potes desde 5V del Arduino)
//
// ADVERTENCIA:
//   Los valores ADC dependen del voltaje de referencia.
//   Para que los valores sean compatibles con el PIC (FVR 2.048V),
//   alimenta los potes desde 5V y usa referencia DEFAULT (5V).
//   Ambos sistemas son ratiometricos -> mismos ADC counts.

#define MODO_CALIBRACION  1   // 1 = calibracion interactiva, 0 = monitor

#define PIN_SETPOINT      A0
#define PIN_FEEDBACK      A1
#define MUESTRAS          16
#define BAUD               115200
#define SERIAL_TIMEOUT    30000

// ============================================================
// UTILIDADES
// ============================================================

static uint16_t leer_avg(uint8_t pin)
{
    uint32_t suma = 0;
    for (uint8_t i = 0; i < MUESTRAS; i++) {
        suma += analogRead(pin);
    }
    return (uint16_t)(suma / MUESTRAS);
}

static void esperar_tecla(void)
{
    unsigned long inicio = millis();
    while (true) {
        if (Serial.available() > 0) {
            while (Serial.available()) Serial.read();
            return;
        }
        if (millis() - inicio > SERIAL_TIMEOUT) {
            Serial.println(F("\r\n[TIMEOUT] No se detecto entrada. Reinicie.\r\n"));
            while (true);
        }
    }
}

// ============================================================
// MODO 1: CALIBRACION INTERACTIVA
// ============================================================

static void modo_calibracion(void)
{
    Serial.println(F("\r\n========================================"));
    Serial.println(F("  CALIBRACION DE POTENCIOMETROS"));
    Serial.println(F("========================================"));
    Serial.println(F(""));
    Serial.println(F("Gire cada pote al minimo (0 grados) y al"));
    Serial.println(F("maximo (360 grados) cuando se le indique."));
    Serial.println(F("Luego presione cualquier tecla."));
    Serial.println(F(""));

    // --- SETPOINT 0° ---
    Serial.print(F("Paso 1: Gire SETPOINT a 0 grados (minimo)."));
    Serial.println(F("  Presione cualquier tecla..."));
    esperar_tecla();
    uint16_t sp_0 = leer_avg(PIN_SETPOINT);
    Serial.print(F("  SETPOINT 0 deg (ADC) = "));
    Serial.println(sp_0);
    Serial.println(F(""));

    // --- SETPOINT 360° ---
    Serial.print(F("Paso 2: Gire SETPOINT a 360 grados (maximo)."));
    Serial.println(F("  Presione cualquier tecla..."));
    esperar_tecla();
    uint16_t sp_360 = leer_avg(PIN_SETPOINT);
    Serial.print(F("  SETPOINT 360 deg (ADC) = "));
    Serial.println(sp_360);
    Serial.println(F(""));

    // --- FEEDBACK 0° ---
    Serial.print(F("Paso 3: Gire FEEDBACK a 0 grados (minimo)."));
    Serial.println(F("  Presione cualquier tecla..."));
    esperar_tecla();
    uint16_t fb_0 = leer_avg(PIN_FEEDBACK);
    Serial.print(F("  FEEDBACK 0 deg (ADC) = "));
    Serial.println(fb_0);
    Serial.println(F(""));

    // --- FEEDBACK 360° ---
    Serial.print(F("Paso 4: Gire FEEDBACK a 360 grados (maximo)."));
    Serial.println(F("  Presione cualquier tecla..."));
    esperar_tecla();
    uint16_t fb_360 = leer_avg(PIN_FEEDBACK);
    Serial.print(F("  FEEDBACK 360 deg (ADC) = "));
    Serial.println(fb_360);
    Serial.println(F(""));

    // --- RESULTADOS ---
    Serial.println(F("========================================"));
    Serial.println(F("  RESULTADOS DE CALIBRACION"));
    Serial.println(F("========================================"));
    Serial.println(F(""));
    Serial.println(F("Copie estos valores en main.c:"));
    Serial.println(F(""));

    Serial.print(F("#define SP_ADC_0    "));
    Serial.println(sp_0);
    Serial.print(F("#define FB_ADC_0    "));
    Serial.println(fb_0);
    Serial.println(F(""));
    Serial.print(F("#define SP_ADC_360  "));
    Serial.println(sp_360);
    Serial.print(F("#define FB_ADC_360  "));
    Serial.println(fb_360);

    int16_t sp_delta = (sp_360 > sp_0) ? (sp_360 - sp_0) : (sp_0 - sp_360);
    int16_t fb_delta = (fb_360 > fb_0) ? (fb_360 - fb_0) : (fb_0 - fb_360);

    Serial.println(F(""));
    Serial.println(F("----------------------------------------"));
    Serial.println(F("  RANGO DETECTADO"));
    Serial.println(F("----------------------------------------"));
    Serial.println(F(""));
    Serial.print(F("SETPOINT rango: "));
    Serial.print(sp_delta);
    Serial.print(F(" counts ("));
    Serial.print(sp_360 > sp_0 ? F("normal") : F("INVERTIDO"));
    Serial.println(F(")"));
    Serial.print(F("FEEDBACK rango: "));
    Serial.print(fb_delta);
    Serial.print(F(" counts ("));
    Serial.print(fb_360 > fb_0 ? F("normal") : F("INVERTIDO"));
    Serial.println(F(")"));
    Serial.println(F(""));
    Serial.println(F("Formula: grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)"));
    Serial.println(F(""));
    Serial.println(F("========================================"));
    Serial.println(F("  CALIBRACION COMPLETADA"));
    Serial.println(F("========================================"));
    Serial.println(F(""));
    Serial.println(F("Enviando posicion de potes en vivo..."));
    Serial.println(F("Formato: ADC_SP,ADC_FB,DEG_SP,DEG_FB"));
    Serial.println(F(""));

    while (true) {
        uint16_t adc_sp = leer_avg(PIN_SETPOINT);
        uint16_t adc_fb = leer_avg(PIN_FEEDBACK);

        int32_t deg_sp = ((int32_t)adc_sp - (int32_t)sp_0) * 360L / ((int32_t)sp_360 - (int32_t)sp_0);
        int32_t deg_fb = ((int32_t)adc_fb - (int32_t)fb_0) * 360L / ((int32_t)fb_360 - (int32_t)fb_0);
        if (deg_sp < 0) deg_sp = 0;
        if (deg_sp > 360) deg_sp = 360;
        if (deg_fb < 0) deg_fb = 0;
        if (deg_fb > 360) deg_fb = 360;

        Serial.print(adc_sp);
        Serial.print(F(","));
        Serial.print(adc_fb);
        Serial.print(F(","));
        Serial.print(deg_sp);
        Serial.print(F(","));
        Serial.println(deg_fb);

        delay(20);
    }
}

// ============================================================
// MODO 2: MONITOR EN VIVO
// ============================================================

// NOTA: Antes de usar este modo, actualice las constantes
// abajo con los valores obtenidos en el modo CALIBRACION.

#define SP_ADC_0    0
#define FB_ADC_0    0
#define SP_ADC_360  1023
#define FB_ADC_360  1023

static int16_t adc_a_grados(uint16_t raw, uint16_t adc_0, uint16_t adc_360)
{
    int32_t rango = (int32_t)adc_360 - (int32_t)adc_0;
    if (rango == 0) return 0;
    int32_t deg = ((int32_t)raw - (int32_t)adc_0) * 360L / rango;
    if (deg < 0) deg = 0;
    if (deg > 360) deg = 360;
    return (int16_t)deg;
}

static void modo_monitor(void)
{
    Serial.println(F("\r\n=== MONITOR DE POTENCIOMETROS ==="));
    Serial.println(F("Gire los potes y observe los valores."));
    Serial.println(F("Formato: ADC_SP,ADC_FB,DEG_SP,DEG_FB"));
    Serial.println(F(""));

    while (true) {
        uint16_t adc_sp = leer_avg(PIN_SETPOINT);
        uint16_t adc_fb = leer_avg(PIN_FEEDBACK);

        int16_t deg_sp = adc_a_grados(adc_sp, SP_ADC_0, SP_ADC_360);
        int16_t deg_fb = adc_a_grados(adc_fb, FB_ADC_0, FB_ADC_360);

        Serial.print(adc_sp);
        Serial.print(F(","));
        Serial.print(adc_fb);
        Serial.print(F(","));
        Serial.print(deg_sp);
        Serial.print(F(","));
        Serial.println(deg_fb);

        delay(20);
    }
}

// ============================================================
// SETUP & LOOP
// ============================================================

void setup()
{
    Serial.begin(BAUD);
    while (!Serial) { ; }

    if (MODO_CALIBRACION) {
        modo_calibracion();
    } else {
        modo_monitor();
    }
}

void loop()
{
}
