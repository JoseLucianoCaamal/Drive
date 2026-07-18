const db = require('./database.js');

const superUsuario = 'akko';
const superPass = 'akkojlca312';

// Insertamos los datos en la tabla
db.run(`INSERT INTO usuarios (usuario, password) VALUES (?, ?)`, [superUsuario, superPass], function(err) {
    if (err) {
        console.error('Error al crear usuario (¿Quizás ya existe?):', err.message);
    } else {
        console.log(`¡Éxito total! El superusuario '${superUsuario}' ha sido creado.`);
    }
    
    // Cerramos la base de datos para que el script termine correctamente
    db.close();
});
