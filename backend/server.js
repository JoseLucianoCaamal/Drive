const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// --- 1. BASE DE DATOS Y LLAVE SECRETA ---
const db = new sqlite3.Database(path.join(__dirname, '../drive.db'));
const SECRET_KEY = "GatitosEspaciales2026"; // Tu token solicitado

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        initial_password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS metadata (
        path TEXT PRIMARY KEY,
        owner TEXT,
        is_public INTEGER DEFAULT 0
    )`);

    // Superusuario
    const superUser = 'akkojlca';
    const superPass = bcrypt.hashSync('akkojlca312', 8);
    db.get("SELECT * FROM users WHERE username = ?", [superUser], (err, row) => {
        if (!row) {
            db.run("INSERT INTO users (username, password, role, initial_password) VALUES (?, ?, ?, ?)", 
            [superUser, superPass, 'admin', 'akkojlca312']);
        }
    });
});

// --- 2. MIDDLEWARES DE SEGURIDAD ---
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Acceso denegado.' });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido.' });
        req.user = decoded;
        next();
    });
};

const verificarAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    next();
};

const tokenOpcional = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token && token !== 'null') {
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (!err) req.user = decoded;
            next();
        });
    } else {
        req.user = null;
        next();
    }
};

const normalizePath = (p) => p.replace(/\\/g, '/');

// --- 3. RUTAS API (Siempre van antes que las estáticas) ---

// Login y cambio de pass
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role, username: user.username });
    });
});

app.post('/cambiar-password', verificarToken, (req, res) => {
    const { newPassword } = req.body;
    const hash = bcrypt.hashSync(newPassword, 8);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hash, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar' });
        res.send('Contraseña actualizada');
    });
});

// Panel de Usuarios (Solo Admin)
app.get('/api/users', verificarToken, verificarAdmin, (req, res) => {
    db.all("SELECT id, username, role, initial_password FROM users WHERE role != 'admin'", [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/users', verificarToken, verificarAdmin, (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 8);
    db.run("INSERT INTO users (username, password, role, initial_password) VALUES (?, ?, 'user', ?)", 
        [username, hash, password], (err) => {
        if (err) return res.status(400).json({ error: 'El usuario ya existe' });
        res.send('Usuario creado');
    });
});

app.delete('/api/users/:username', verificarToken, verificarAdmin, (req, res) => {
    db.run("DELETE FROM users WHERE username = ?", [req.params.username], () => res.send('Eliminado'));
});

app.post('/api/users/reset', verificarToken, verificarAdmin, (req, res) => {
    const { username, initial_password } = req.body;
    const hash = bcrypt.hashSync(initial_password, 8);
    db.run("UPDATE users SET password = ? WHERE username = ?", [hash, username], () => res.send('Reseteado'));
});

// Operaciones de Archivos (CRUD)
app.get('/listar', tokenOpcional, (req, res) => {
    const subPath = req.query.path || '';
    const dirPath = path.join(__dirname, '../uploads', subPath);
    if (!fs.existsSync(dirPath)) return res.json([]);

    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: 'Error al leer' });

        db.all("SELECT * FROM metadata", [], (err, rows) => {
            const metaMap = {};
            if (rows) rows.forEach(r => metaMap[r.path] = r);

            const list = files.map(f => {
                const itemPath = normalizePath(subPath ? `${subPath}/${f.name}` : f.name);
                const meta = metaMap[itemPath] || { owner: 'akkojlca', is_public: 0 };
                return { 
                    name: f.name, isDirectory: f.isDirectory(), path: itemPath, 
                    owner: meta.owner, is_public: meta.is_public 
                };
            }).filter(item => {
                if (item.is_public === 1) return true;
                if (req.user && (req.user.username === item.owner || req.user.role === 'admin')) return true;
                return false;
            });
            res.json(list);
        });
    });
});

app.post('/crear-carpeta', verificarToken, (req, res) => {
    const { currentPath, folderName } = req.body;
    const itemPath = normalizePath(currentPath ? `${currentPath}/${folderName}` : folderName);
    const dir = path.join(__dirname, '../uploads', itemPath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        db.run("INSERT OR REPLACE INTO metadata (path, owner, is_public) VALUES (?, ?, 0)", [itemPath, req.user.username]);
        res.send('Carpeta creada');
    } else {
        res.status(400).json({ error: 'La carpeta ya existe' });
    }
});

app.put('/visibilidad', verificarToken, (req, res) => {
    const { targetPath, is_public } = req.body;
    db.run("UPDATE metadata SET is_public = ? WHERE path = ? OR path LIKE ?", 
        [is_public, targetPath, `${targetPath}/%`], () => res.send('Visibilidad actualizada'));
});

app.delete('/eliminar', verificarToken, (req, res) => {
    const { targetPath } = req.body;
    const fullPath = path.join(__dirname, '../uploads', targetPath);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        db.run("DELETE FROM metadata WHERE path = ? OR path LIKE ?", [targetPath, `${targetPath}/%`]);
        res.send('Eliminado');
    } else res.status(404).json({ error: 'No encontrado' });
});

app.put('/renombrar', verificarToken, (req, res) => {
    const { oldPath, newName } = req.body;
    const oldFullPath = path.join(__dirname, '../uploads', oldPath);
    const newPath = normalizePath(path.join(path.dirname(oldPath), newName));
    const newFullPath = path.join(__dirname, '../uploads', newPath);

    if (fs.existsSync(oldFullPath)) {
        fs.renameSync(oldFullPath, newFullPath);
        db.run("UPDATE metadata SET path = REPLACE(path, ?, ?) WHERE path LIKE ?", [oldPath, newPath, `${oldPath}%`]);
        res.send('Renombrado');
    } else res.status(404).json({ error: 'No encontrado' });
});

// Multer y rutas estáticas
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subPath = req.query.path || ''; 
        const dest = path.join(__dirname, '../uploads', subPath);
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => { cb(null, file.originalname); }
});
const upload = multer({ storage: storage });

app.post('/subir', verificarToken, upload.single('archivo'), (req, res) => {
    if (!req.file) return res.status(400).send('No se recibió archivo');
    const subPath = req.query.path || '';
    const itemPath = normalizePath(subPath ? `${subPath}/${req.file.originalname}` : req.file.originalname);
    db.run("INSERT OR REPLACE INTO metadata (path, owner, is_public) VALUES (?, ?, 0)", 
        [itemPath, req.user.username], () => res.send('Subido'));
});

app.use('/img', express.static(path.join(__dirname, '../Img')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.listen(3000, () => console.log('Servidor activo en el puerto 3000'));