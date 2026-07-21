let currentPath = '';

// Función para mostrar la notificación
function showNotification(msg) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = msg;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// Subir archivos
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return showNotification('Selecciona un archivo');

    const formData = new FormData();
    formData.append('archivo', input.files[0]);

    try {
        const url = `/subir?path=${encodeURIComponent(currentPath)}`;
        const res = await fetch(url, { method: 'POST', body: formData });
        
        if (res.ok) {
            showNotification('¡Archivo subido con éxito!');
            input.value = '';
            document.getElementById('file-name').innerText = 'Haz clic para seleccionar un archivo';
            cargarArchivos(currentPath);
        } else {
            showNotification('Error en el servidor');
        }
    } catch (e) {
        showNotification('Error de conexión');
    }
}

// Listar y navegar
async function cargarArchivos(folderPath = '') {
    currentPath = folderPath;
    document.getElementById('current-folder-label').innerText = 
        folderPath ? `Subiendo a: /${folderPath}` : 'Subiendo a: Raíz';

    const res = await fetch(`/listar?path=${encodeURIComponent(folderPath)}`);
    const archivos = await res.json();
    const listaDiv = document.getElementById('file-list');
    
    listaDiv.innerHTML = ''; 

    if (currentPath !== '') {
        const backBtn = document.createElement('div');
        backBtn.className = 'file-item';
        backBtn.innerHTML = '⬅️ Volver atrás';
        backBtn.onclick = () => {
            const parent = currentPath.substring(0, currentPath.lastIndexOf('/'));
            cargarArchivos(parent);
        };
        listaDiv.appendChild(backBtn);
    }
    
    archivos.forEach(archivo => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `${archivo.isDirectory ? '📁' : '📄'} &nbsp; ${archivo.name}`;
        
        if (archivo.isDirectory) {
            item.onclick = () => cargarArchivos(archivo.path);
        } else {
            item.onclick = () => window.open(`/uploads/${archivo.path}`, '_blank');
        }
        
        listaDiv.appendChild(item);
    });
}

function mostrarNombre() {
    const input = document.getElementById('inputArchivo');
    if(input.files.length > 0) {
        document.getElementById('file-name').innerText = "📄 " + input.files[0].name;
    }
}

// --- NUEVA LÓGICA PARA EL TEMA CLARO/OSCURO ---
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        localStorage.setItem('drive-theme', 'light');
        themeBtn.innerText = '🌙';
        themeBtn.title = "Cambiar a modo oscuro";
    } else {
        localStorage.setItem('drive-theme', 'dark');
        themeBtn.innerText = '☀️';
        themeBtn.title = "Cambiar a modo claro";
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('drive-theme');
    const themeBtn = document.getElementById('theme-toggle');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeBtn.innerText = '🌙';
    }
}

// Iniciar aplicación
window.onload = () => {
    loadTheme();
    cargarArchivos();
};