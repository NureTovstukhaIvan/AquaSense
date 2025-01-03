const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const db = require('./src/config/db');
const mqtt = require('mqtt'); // MQTT клієнт

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Підключення маршрутів
const userRoutes = require('./src/routes/users');
const aquariumRoutes = require('./src/routes/aquariums');
const deviceRoutes = require('./src/routes/devices');
const sensorRoutes = require('./src/routes/sensors');
const logRoutes = require('./src/routes/logs');

app.use('/users', userRoutes);
app.use('/aquariums', aquariumRoutes);
app.use('/devices', deviceRoutes);
app.use('/sensors', sensorRoutes);
app.use('/logs', logRoutes);

// MQTT брокер
const mqttBroker = 'mqtt://test.mosquitto.org';
const mqttClient = mqtt.connect(mqttBroker);

// Теми MQTT
const topics = [
  { topic: 'aquarium/sensor/temperature', sensorType: 'temperature', deviceName: 'thermostat', range: [22, 28] },
  { topic: 'aquarium/sensor/oxygen', sensorType: 'oxygen', deviceName: 'aerator', range: [4, 10] },
  { topic: 'aquarium/sensor/ph', sensorType: 'ph', deviceName: 'phController', range: [5, 8] },
];

// Поточний сенсор
let currentIndex = 0;
let processing = false;

// Підключення до MQTT
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(topics.map(t => t.topic), (err) => {
    if (err) {
      console.error('Error subscribing to topics:', err.message);
    } else {
      console.log('Subscribed to topics:', topics.map(t => t.topic).join(', '));
    }
  });
});

// Обробка отриманих даних
mqttClient.on('message', async (topic, message) => {
  if (processing) return; // Чекаємо завершення обробки попереднього сенсора

  const { topic: currentTopic, sensorType, deviceName, range } = topics[currentIndex];
  if (topic !== currentTopic) return; // Пропускаємо дані, якщо це не поточний сенсор

  processing = true; // Починаємо обробку
  const value = parseFloat(message.toString());
  console.log(`Received on ${sensorType}: ${value}`);

  // Оновлення значення сенсора в базі даних
  try {
    await db.query('UPDATE Sensors SET value = ? WHERE type = ?', [value, sensorType]);
  } catch (error) {
    console.error(`Error updating ${sensorType} in database:`, error.message);
    processing = false;
    return;
  }

  // Якщо значення в нормі
  if (value >= range[0] && value <= range[1]) {
    await delay(3000); // Пауза перед переходом до наступного сенсора
    processing = false;
    currentIndex = (currentIndex + 1) % topics.length;
    return;
  }

  // Якщо значення поза межами норми
  try {
    const newValue = value < range[0] ? range[0] : range[1];

    // Логування перед корекцією
    await db.query('INSERT INTO Logs (sensor_id, message) VALUES (?, ?)', [
      (await getSensorId(sensorType)),
      `Device ${deviceName} turned on to correct ${sensorType} from ${value} to ${newValue}`,
    ]);

    // Вивід у термінал перед корекцією
    console.log(`Device ${deviceName} turned on`);

    // Вмикання пристрою
    mqttClient.publish('aquarium/device/control', `${deviceName}_on`);

    await delay(6000); // Пауза перед перевіркою результату

    // Оновлення значення сенсора до норми в базі даних
    await db.query('UPDATE Sensors SET value = ? WHERE type = ?', [newValue, sensorType]);

    // Вивід у термінал після корекції
    console.log(`Received on ${sensorType}: ${newValue}`);

    // Логування після корекції
    await db.query('INSERT INTO Logs (sensor_id, message) VALUES (?, ?)', [
      (await getSensorId(sensorType)),
      `Device ${deviceName} turned off after correcting ${sensorType}`,
    ]);

    console.log(`Device ${deviceName} turned off`);

    // Оновлення статусу пристрою в базі даних (вимикання)
    await db.query('UPDATE Devices SET status = ? WHERE name = ?', ['off', deviceName]);

    // Вимикання пристрою
    mqttClient.publish('aquarium/device/control', `${deviceName}_off`);

    await delay(1000); // Пауза перед переходом до наступного сенсора
    processing = false;
    currentIndex = (currentIndex + 1) % topics.length; // Перехід до наступного сенсора
  } catch (error) {
    console.error('Error during correction process:', error.message);
    processing = false;
  }
});

// Функція для отримання ID сенсора
async function getSensorId(sensorType) {
  const [rows] = await db.query('SELECT id FROM Sensors WHERE type = ?', [sensorType]);
  return rows.length > 0 ? rows[0].id : null;
}

// Затримка
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Тестовий маршрут
app.get('/', (req, res) => {
    res.send('Welcome to AquaSense API');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger UI is available at http://localhost:${PORT}/api-docs`);
});
