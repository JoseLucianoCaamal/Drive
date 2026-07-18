const db = require('./database.js');

console.log("Iniciando actualización de la base de datos...");

db.serialize(() => {
    // 1. Le agregamos la columna 'rol' a los usuarios existentes
    db.run(`ALTER TABLE usuarios ADD COLUMN rol TEXT DEFAULT 'usuario'`, (err) => {
        if (err) {
            console.log("Nota: La columna 'rol' ya existía. Continuando...");
        } else {
            console.log("✅ Columna 'rol' añadida correctamente.");
        }
        
        // 2. Coronamos a 'akko' como el Dios del servidor
        db.run(`UPDATE usuarios SET rol = 'admin' WHERE usuario = 'akko'`, (err) => {
            if (err) console.error("Error al actualizar a akko:", err.message);
            else console.log("👑 ¡'akko' ha sido ascendido a Super Usuario (Admin)!");
        });
    });

    // 3. Creamos una tabla nueva para registrar cada archivo que se suba
    db.run(`CREATE TABLE IF NOT EXISTS archivos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_original TEXT,
        nombre_fisico TEXT,
        tipo_mime TEXT,
        propietario TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error al crear tabla archivos:", err.message);
        else console.log("📁 Tabla de 'archivos' creada y lista para registrar subidas.");
    });
});

// Cerramos la conexión de forma segura después de 1 segundo
setTimeout(() => {
    db.close();
    console.log("Actualización finalizada. Ya puedes borrar este archivo.");
}, 1000);
