const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Necesario para leer archivos
const app = express();

const storage = multer.diskStorage({
    destination: '../uploads/Lic/', 
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

// Servir carpetas estáticas
app.use('/img', express.static(path.join(__dirname, '../Img')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// NUEVA RUTA: Listar archivos
// Reemplaza tu ruta /listar actual por esta:
app.get('/listar', (req, res) => {
    // Obtenemos la ruta que pide el usuario (si no hay, es la raíz)
    const subPath = req.query.path || ''; 
    
    // Seguridad: evitar que intenten salir de la carpeta uploads con ".."
    if (subPath.includes('..')) return res.status(403).json({ error: 'Acceso denegado' });

    const dirPath = path.join(__dirname, '../uploads', subPath);
    
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: 'No se pudo leer la carpeta' });
        
        const list = files.map(f => ({ 
            name: f.name, 
            isDirectory: f.isDirectory(),
            path: subPath ? `${subPath}/${f.name}` : f.name
        }));
        res.json(list);
    });
});

app.post('/subir', upload.single('archivo'), (req, res) => {
    if (!req.file) return res.status(400).send('No se recibió archivo');
    res.send('Subido con éxito');
});

app.listen(3000, () => {
    console.log('Servidor activo en http://192.168.1.140:3000');
});