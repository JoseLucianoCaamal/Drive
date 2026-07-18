const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crea un archivo llamado 'drive.db' en tu carpeta backend
const dbPath = path.join(__dirname, 'drive.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Base de datos conectada con éxito.');
        
        // Crear la tabla de usuarios si no existe
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error('Error al crear tabla:', err.message);
            } else {
                console.log('Tabla de usuarios lista y operativa.');
            }
        });
    }
});

module.exports = db;
