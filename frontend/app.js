let currentPath = '';

function showNotification(msg) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = msg;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// --- CONTROL DEL MODAL DE LOGIN ---
function abrirModal() {
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
    // Pequeño delay para que la animación de CSS funcione
    setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// --- LÓGICA DE LOGIN ---
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (!user || !pass) return showNotification("Ingresa usuario y contraseña");

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('drive-token', data.token);
            localStorage.setItem('drive-user', data.username);
            showNotification("¡Bienvenido " + data.username + "!");
            cerrarModal();
            checkAuth(); // Actualiza la vista
        } else {
            showNotification(data.error || "Error al iniciar sesión");
        }
    } catch (e) {
        showNotification("Error de conexión con el servidor");
    }
}

function logout() {
    localStorage.removeItem('drive-token');
    localStorage.removeItem('drive-user');
    checkAuth();
    showNotification("Sesión cerrada");
}

function checkAuth() {
    const token = localStorage.getItem('drive-token');
    const user = localStorage.getItem('drive-user');

    if (token) {
        // MODO ADMIN
        document.getElementById('upload-section').style.display = 'block';
        document.getElementById('login-btn-top').style.display = 'none';
        document.getElementById('user-bar-top').style.display = 'flex';
        document.getElementById('welcome-text').innerText = "👑 " + user;
    } else {
        // MODO INVITADO
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('login-btn-top').style.display = 'block';
        document.getElementById('user-bar-top').style.display = 'none';
    }
}

// --- SUBIDA DE ARCHIVOS CON SEGURIDAD ---
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return showNotification('Selecciona un archivo');

    const token = localStorage.getItem('drive-token'); 
    const formData = new FormData();
    formData.append('archivo', input.files[0]);

    try {
        const url = `/subir?path=${encodeURIComponent(currentPath)}`;
        const res = await fetch(url, { 
            method: 'POST', 
            body: formData,
            headers: { 'Authorization': token }
        });
        
        if (res.ok) {
            showNotification('¡Archivo subido con éxito!');
            input.value = '';
            document.getElementById('file-name').innerText = 'Haz clic para seleccionar un archivo';
            cargarArchivos(currentPath);
        } else {
            if(res.status === 401 || res.status === 403) {
                showNotification('Sesión expirada o inválida.');
                logout();
            } else {
                showNotification('Error en el servidor');
            }
        }
    } catch (e) {
        showNotification('Error de conexión');
    }
}

// --- NAVEGACIÓN PÚBLICA ---
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

// --- TEMA CLARO/OSCURO ---
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        localStorage.setItem('drive-theme', 'light');
        themeBtn.innerText = '🌙';
    } else {
        localStorage.setItem('drive-theme', 'dark');
        themeBtn.innerText = '☀️';
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

// Al iniciar
window.onload = () => {
    loadTheme();
    checkAuth();
    cargarArchivos(); // Ahora los archivos se cargan SIN importar si hay sesión
};