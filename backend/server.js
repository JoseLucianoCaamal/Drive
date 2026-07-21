const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// --- 1. CONFIGURACIÓN DE BASE DE DATOS Y SUPERUSUARIO ---
// Conectamos a tu drive.db existente
const db = new sqlite3.Database(path.join(__dirname, '../drive.db'));
const SECRET_KEY = "GatitosEspaciales2026"; // Firma para los tokens

db.serialize(() => {
    // Creamos la tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // Inyectamos tu Superusuario automáticamente si no existe
    const superUser = 'akkojlca';
    const superPass = bcrypt.hashSync('akkojlca312', 8); // Encriptamos la contraseña

    db.get("SELECT * FROM users WHERE username = ?", [superUser], (err, row) => {
        if (!row) {
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
            [superUser, superPass, 'admin']);
            console.log("👑 Superusuario AKKO creado con éxito.");
        }
    });
});

// --- 2. MIDDLEWARE DE SEGURIDAD (El Cadenero) ---
const verificarToken = (req, res, next) => {
    // Busca el token en los headers de la petición
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Acceso denegado. Inicia sesión.' });
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido o expirado.' });
        req.user = decoded; // Guardamos los datos del usuario (id, username, role)
        next(); // Lo dejamos pasar
    });
};

// --- 3. RUTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        // Comparamos contraseñas
        const passwordValida = bcrypt.compareSync(password, user.password);
        if (!passwordValida) return res.status(401).json({ error: 'Contraseña incorrecta' });
        
        // Generamos el Gafete Virtual (Token) válido por 24 horas
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token: token, role: user.role, username: user.username });
    });
});


// --- 4. CONFIGURACIÓN DE RUTAS Y MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subPath = req.query.path || ''; 
        const dest = path.join(__dirname, '../uploads', subPath);
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

app.use('/img', express.static(path.join(__dirname, '../Img')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Listar archivos (Por ahora sigue público, lo bloquearemos en la Fase 3)
app.get('/listar', (req, res) => {
    const subPath = req.query.path || '';
    const dirPath = path.join(__dirname, '../uploads', subPath);
    
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: 'Error al leer' });
        
        const list = files.map(f => ({ 
            name: f.name, 
            isDirectory: f.isDirectory(),
            path: subPath ? `${subPath}/${f.name}` : f.name
        }));
        res.json(list);
    });
});

// SUBIR ARCHIVOS (¡Ahora está protegida por verificarToken!)
app.post('/subir', verificarToken, upload.single('archivo'), (req, res) => {
    if (!req.file) return res.status(400).send('No se recibió archivo');
    // req.user tiene tus datos, aquí sabremos en el futuro quién subió qué
    res.send('Subido con éxito por: ' + req.user.username); 
});

app.listen(3000, () => {
    console.log('Servidor activo en el puerto 3000');
});