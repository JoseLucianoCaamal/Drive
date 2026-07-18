const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json()); 

const carpetaDestino = path.join(__dirname, 'uploads');
if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino);
}

// NUEVO: Esto permite que el frontend pueda ver y cargar las imágenes para la galería
app.use('/uploads', express.static(carpetaDestino));
// Servir imágenes (logos, etc.)
app.use('/img', express.static(path.join(__dirname, 'Img')));

// CONFIGURACIÓN DE ALMACENAMIENTO AVANZADA
const configuracionAlmacenaje = multer.diskStorage({
    destination: function (req, file, cb) {
        // Obtenemos el usuario de la petición
        const usuario = req.body.usuario || 'desconocido';
        const userDir = path.join(carpetaDestino, usuario);
        
        // Creamos la carpeta del usuario si no existe
        if (!fs.existsSync(userDir)){
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        const prefijoUnico = Date.now() + '-';
        cb(null, prefijoUnico + file.originalname);
    }
});
const upload = multer({ storage: configuracionAlmacenaje });

// ==========================================
// RUTA 1: LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) return res.status(400).json({ mensaje: 'Faltan datos' });

    db.get(`SELECT * FROM usuarios WHERE usuario = ? AND password = ?`, [usuario, password], (err, fila) => {
        if (err) return res.status(500).json({ mensaje: 'Error interno' });
        
        if (fila) {
            console.log(`✅ Ingreso: ${usuario} (Rol: ${fila.rol})`);
            // Ahora devolvemos también el rol al frontend
            res.status(200).json({ mensaje: 'Login exitoso', usuario: fila.usuario, rol: fila.rol });
        } else {
            res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
    });
});

// ==========================================
// RUTA 2: SUBIR ARCHIVOS CON REGISTRO
// ==========================================
app.post('/subir', upload.single('archivoDelUsuario'), (req, res) => {
    if (!req.file) return res.status(400).send('No llegó ningún archivo.');

    // El frontend nos enviará quién está subiendo el archivo
    const propietario = req.body.usuario || 'desconocido'; 
    const nombreOriginal = req.file.originalname;
    const nombreFisico = req.file.filename;
    const tipoMime = req.file.mimetype;

    // Registramos en la libreta (Base de Datos)
    db.run(`INSERT INTO archivos (nombre_original, nombre_fisico, tipo_mime, propietario) VALUES (?, ?, ?, ?)`, 
        [nombreOriginal, nombreFisico, tipoMime, propietario], function(err) {
        
        if (err) {
            console.error(err);
            return res.status(500).json({ mensaje: 'Error al registrar en BD' });
        }
        
        console.log(`📁 Nuevo archivo registrado: ${nombreOriginal} por ${propietario}`);
        res.json({ mensaje: 'Archivo guardado con éxito' });
    });
});

// ==========================================
// RUTA 3: OBTENER LISTA DE ARCHIVOS (NUEVO)
// ==========================================
app.post('/api/archivos', (req, res) => {
    const { usuario, rol } = req.body;

    let query = `SELECT * FROM archivos ORDER BY fecha DESC`;
    let params = [];

    // Si el rol NO es admin, le ponemos un filtro para que solo vea los suyos
    if (rol !== 'admin') {
        query = `SELECT * FROM archivos WHERE propietario = ? ORDER BY fecha DESC`;
        params = [usuario];
    }

    db.all(query, params, (err, filas) => {
        if (err) return res.status(500).json({ mensaje: 'Error al leer la base de datos' });
        res.json(filas);
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Servidor Pro V2 (Roles y Galería) activo en puerto 3000...');
});