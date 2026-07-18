const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());

// Configuración de almacenamiento dinámica
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Leemos la ruta desde req.query en lugar de req.body
        const subPath = req.query.path || ''; 
        const dest = path.join(__dirname, '../uploads', subPath);
        
        // Crear carpetas dinámicamente si no existen
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

// Rutas estáticas
app.use('/img', express.static(path.join(__dirname, '../Img')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta para listar archivos y carpetas
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

// Ruta de subida
app.post('/subir', upload.single('archivo'), (req, res) => {
    if (!req.file) return res.status(400).send('No se recibió archivo');
    res.send('Subido con éxito');
});

app.listen(3000, () => {
    console.log('Servidor activo en http://192.168.1.140:3000');
});