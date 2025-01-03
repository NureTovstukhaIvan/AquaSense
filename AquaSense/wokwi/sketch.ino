#include <WiFi.h> 
#include <PubSubClient.h> 
#include <Adafruit_SSD1306.h> 
 
// WiFi 
const char* ssid = "Wokwi-GUEST"; 
const char* password = ""; 
 
// MQTT 
const char* mqtt_server = "test.mosquitto.org";  // Публічний брокер Mosquitto 
const int mqtt_port = 1883; 
WiFiClient espClient; 
PubSubClient client(espClient); 
 
// OLED дисплей 
#define SCREEN_WIDTH 128 
#define SCREEN_HEIGHT 64 
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1); 
 
// Теми MQTT 
const char* temp_topic = "aquarium/sensor/temperature"; 
const char* oxygen_topic = "aquarium/sensor/oxygen"; 
const char* ph_topic = "aquarium/sensor/ph"; 
const char* device_control_topic = "aquarium/device/control"; 
 
// Стани пристроїв 
bool thermostat_status = false; 
bool aerator_status = false; 
bool phController_status = false; 
 
// Таймери 
unsigned long lastSensorUpdate = 0; 
const unsigned long sensorInterval = 5000; // Інтервал оновлення сенсорів 
 
// Глобальні змінні для значень сенсорів 
float temperature = 25.0; // Початкова температура 
float oxygen = 5.0;       // Початковий рівень кисню 
float ph = 6.0;           // Початковий рівень pH
 
// Діапазони норми 
const float TEMP_MIN = 22.0, TEMP_MAX = 28.0; 
const float OXYGEN_MIN = 4.0, OXYGEN_MAX = 10.0; 
const float PH_MIN = 5.0, PH_MAX = 8.0; 

// GPIO для світлодіодів 
const int thermostat_led = 25; 
const int aerator_led = 26; 
const int phController_led = 27; 

// Поточний сенсор для оновлення
int currentSensor = 0; 
 
// Підключення до Wi-Fi 
void setup_wifi() { 
  delay(10); 
  Serial.println("Connecting to WiFi..."); 
  WiFi.begin(ssid, password); 
  while (WiFi.status() != WL_CONNECTED) { 
    delay(1000); 
    Serial.println("Connecting..."); 
  } 
  Serial.println("WiFi connected!"); 
} 
 
// Функція підключення до MQTT 
void reconnect() { 
  while (!client.connected()) { 
    Serial.println("Connecting to MQTT..."); 
    if (client.connect("ESP32-Aquarium")) { 
      Serial.println("Connected to MQTT!"); 
      client.subscribe(device_control_topic); // Підписка на тему для контролю пристроїв 
    } else { 
      delay(5000); 
    } 
  } 
} 
 
// Обробка вхідних повідомлень MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  if (String(topic) == device_control_topic) {
    if (message == "thermostat_on") {
      thermostat_status = true;
      digitalWrite(thermostat_led, HIGH); // Увімкнути LED
    } else if (message == "thermostat_off") {
      thermostat_status = false;
      digitalWrite(thermostat_led, LOW); // Вимкнути LED
    }

    if (message == "aerator_on") {
      aerator_status = true;
      digitalWrite(aerator_led, HIGH); // Увімкнути LED
    } else if (message == "aerator_off") {
      aerator_status = false;
      digitalWrite(aerator_led, LOW); // Вимкнути LED
    }

    if (message == "phController_on") {
      phController_status = true;
      digitalWrite(phController_led, HIGH); // Увімкнути LED
    } else if (message == "phController_off") {
      phController_status = false;
      digitalWrite(phController_led, LOW); // Вимкнути LED
    }

    // Оновлюємо дисплей після зміни стану пристрою
    updateDisplay();
  }
}

// Генерація значень сенсорів 
void updateSensors() { 
  switch (currentSensor) {
    case 0:
      temperature += random(-15, 15) * 1; 
      client.publish(temp_topic, String(temperature).c_str()); 
      break;
    case 1:
      oxygen += random(-5, 5) * 1;        
      client.publish(oxygen_topic, String(oxygen).c_str()); 
      break;
    case 2:
      ph += random(-5, 5) * 1;       
      client.publish(ph_topic, String(ph).c_str()); 
      break;
  }
  currentSensor = (currentSensor + 1) % 3; // Перехід до наступного сенсора
} 
 
// Оновлення OLED-дисплея 
void updateDisplay() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Відображення значень сенсорів
  display.print("Temp: ");
  display.print(temperature);
  display.println(" C");

  display.print("Oxygen: ");
  display.print(oxygen);
  display.println(" mg/L");

  display.print("pH: ");
  display.print(ph);
  display.println("");

  // Відображення стану пристроїв
  display.print("Thermostat: ");
  display.println(thermostat_status ? "ON" : "OFF");

  display.print("Aerator: ");
  display.println(aerator_status ? "ON" : "OFF");

  display.print("pH Controller: ");
  display.println(phController_status ? "ON" : "OFF");

  display.display();
}
 
void setup() { 
  Serial.begin(115200); 
  setup_wifi(); 
  client.setServer(mqtt_server, mqtt_port); 
  client.setCallback(callback); 

  // Налаштування пінів світлодіодів 
  pinMode(thermostat_led, OUTPUT); 
  pinMode(aerator_led, OUTPUT); 
  pinMode(phController_led, OUTPUT); 

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    for (;;); 
  } 
  display.clearDisplay(); 
  display.display(); 
} 
 
void loop() { 
  if (!client.connected()) { 
    reconnect(); 
  } 
  client.loop(); 

  if (millis() - lastSensorUpdate > sensorInterval) { 
    lastSensorUpdate = millis(); 
    updateSensors(); 
    updateDisplay(); // Оновлення дисплея після моніторингу
  } 
}
