const db = require('./database.js');

// Borramos cualquier registro que no tenga un dueño real o que sea el fantasma
db.run(`DELETE FROM archivos WHERE propietario = 'desconocido'`, function(err) {
    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log("👻 ¡Archivos fantasma eliminados de la base de datos!");
    }
    db.close();
});
