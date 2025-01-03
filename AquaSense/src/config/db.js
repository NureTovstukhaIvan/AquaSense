const mysql = require('mysql2');

// Налаштування підключення до бази даних
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '12309855qwepoiT', 
    database: 'AquaSense',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Експорт підключення з підтримкою промісів
const db = pool.promise();

module.exports = db;
