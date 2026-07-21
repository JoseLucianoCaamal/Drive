let currentPath = '';

function showNotification(msg) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = msg;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// --- AUTH ---
async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (!user || !pass) return showNotification("Faltan datos");

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
            localStorage.setItem('drive-role', data.role);
            cerrarModal('login-modal');
            checkAuth();
        } else showNotification(data.error);
    } catch (e) { showNotification("Error de conexión"); }
}

function logout() {
    localStorage.clear();
    checkAuth();
    showNotification("Sesión cerrada");
}

function checkAuth() {
    const token = localStorage.getItem('drive-token');
    const user = localStorage.getItem('drive-user');
    const role = localStorage.getItem('drive-role');

    if (token) {
        document.getElementById('upload-section').style.display = 'block';
        document.getElementById('login-btn-top').style.display = 'none';
        document.getElementById('user-bar-top').style.display = 'flex';
        document.getElementById('welcome-text').innerText = (role === 'admin' ? "👑 " : "👤 ") + user;
        document.getElementById('admin-btn').style.display = role === 'admin' ? 'inline-block' : 'none';
    } else {
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('login-btn-top').style.display = 'block';
        document.getElementById('user-bar-top').style.display = 'none';
    }
    cargarArchivos(currentPath);
}

// --- ARCHIVOS ---
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return showNotification('Selecciona un archivo');
    const formData = new FormData();
    formData.append('archivo', input.files[0]);

    try {
        const res = await fetch(`/subir?path=${encodeURIComponent(currentPath)}`, { 
            method: 'POST', body: formData, headers: { 'Authorization': localStorage.getItem('drive-token') }
        });
        if (res.ok) { showNotification('Subido'); input.value = ''; mostrarNombre(); cargarArchivos(currentPath); }
        else { res.status === 401 ? logout() : showNotification('Error'); }
    } catch (e) { showNotification('Error'); }
}

async function cargarArchivos(folderPath = '') {
    currentPath = folderPath;
    document.getElementById('current-folder-label').innerText = folderPath ? `Ruta: /${folderPath}` : 'Ruta: Raíz';

    const token = localStorage.getItem('drive-token');
    const role = localStorage.getItem('drive-role');
    const currentUser = localStorage.getItem('drive-user');
    
    const res = await fetch(`/listar?path=${encodeURIComponent(folderPath)}`, {
        headers: token ? { 'Authorization': token } : {}
    });
    const archivos = await res.json();
    const listaDiv = document.getElementById('file-list');
    listaDiv.innerHTML = ''; 

    if (currentPath !== '') {
        const backBtn = document.createElement('div');
        backBtn.className = 'file-item'; backBtn.innerHTML = '⬅️ Volver atrás';
        backBtn.onclick = () => cargarArchivos(currentPath.substring(0, currentPath.lastIndexOf('/')));
        listaDiv.appendChild(backBtn);
    }
    
    archivos.forEach(archivo => {
        const isMedia = archivo.name.match(/\.(mp4|webm|mp3|wav|ogg)$/i);
        const itemContainer = document.createElement('div');
        itemContainer.className = 'file-item-container';

        const item = document.createElement('div');
        item.className = 'file-item-main';
        
        let visibilityBadge = archivo.is_public ? '<span class="status-badge badge-public">Público</span>' : '<span class="status-badge badge-private">Privado</span>';
        item.innerHTML = `${archivo.isDirectory ? '📁' : (isMedia ? '🎞️' : '📄')} &nbsp; ${archivo.name} ${visibilityBadge}`;
        
        item.onclick = () => {
            if (archivo.isDirectory) cargarArchivos(archivo.path);
            else if (isMedia) abrirAkkflix(archivo.path, archivo.name);
            else window.open(`/uploads/${archivo.path}`, '_blank');
        };
        itemContainer.appendChild(item);

        // Controles si es dueño o admin
        if (token && (role === 'admin' || currentUser === archivo.owner)) {
            const actions = document.createElement('div');
            actions.className = 'file-actions';
            
            const btnVis = document.createElement('button');
            btnVis.innerText = archivo.is_public ? '🔒' : '🌍';
            btnVis.title = "Cambiar Visibilidad";
            btnVis.onclick = () => toggleVisibilidad(archivo.path, archivo.is_public ? 0 : 1);

            const btnRename = document.createElement('button');
            btnRename.innerText = '✏️'; btnRename.onclick = () => renombrarItem(archivo.path, archivo.name);

            const btnDelete = document.createElement('button');
            btnDelete.innerText = '🗑️'; btnDelete.onclick = () => eliminarItem(archivo.path);

            actions.append(btnVis, btnRename, btnDelete);
            itemContainer.appendChild(actions);
        }
        listaDiv.appendChild(itemContainer);
    });
}

// --- AKKFLIX ---
function abrirAkkflix(path, name) {
    const container = document.getElementById('media-container');
    const ext = name.split('.').pop().toLowerCase();
    container.innerHTML = '';
    
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
        container.innerHTML = `<video controls autoplay><source src="/uploads/${path}" type="video/${ext}"></video>`;
    } else {
        container.innerHTML = `<audio controls autoplay><source src="/uploads/${path}" type="audio/${ext}"></audio>`;
    }
    abrirModal('akkflix-modal');
}
function cerrarAkkflix() {
    document.getElementById('media-container').innerHTML = ''; // Detiene el video
    cerrarModal('akkflix-modal');
}

// --- CRUD ARCHIVOS ---
async function crearCarpeta() {
    const folderName = prompt("Nombre de la carpeta:");
    if (!folderName) return;
    await fetch('/crear-carpeta', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ currentPath, folderName }) });
    cargarArchivos(currentPath);
}

async function eliminarItem(targetPath) {
    if (!confirm("⚠️ ¿Eliminar permanentemente?")) return;
    await fetch('/eliminar', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ targetPath }) });
    cargarArchivos(currentPath);
}

async function renombrarItem(oldPath, oldName) {
    const newName = prompt("Nuevo nombre:", oldName);
    if (!newName || newName === oldName) return;
    await fetch('/renombrar', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ oldPath, newName }) });
    cargarArchivos(currentPath);
}

async function toggleVisibilidad(targetPath, is_public) {
    await fetch('/visibilidad', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ targetPath, is_public }) });
    cargarArchivos(currentPath);
}

// --- PANEL ADMIN ---
async function abrirDashboard() {
    abrirModal('dashboard-modal');
    const res = await fetch('/api/users', { headers: { 'Authorization': localStorage.getItem('drive-token') } });
    const users = await res.json();
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    users.forEach(u => {
        list.innerHTML += `
            <div class="user-item">
                <div class="user-info">👤 <span>${u.username}</span> <br> Pass Inicial: ${u.initial_password}</div>
                <div class="file-actions">
                    <button title="Resetear Pass" onclick="resetearPass('${u.username}', '${u.initial_password}')">🔄</button>
                    <button title="Eliminar" onclick="eliminarUsuario('${u.username}')">🗑️</button>
                </div>
            </div>`;
    });
}

async function crearUsuario() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-userpass').value;
    await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ username, password }) });
    abrirDashboard();
}

async function eliminarUsuario(username) {
    if(confirm(`¿Eliminar al usuario ${username}?`)) {
        await fetch(`/api/users/${username}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('drive-token') } });
        abrirDashboard();
    }
}

async function resetearPass(username, initial_password) {
    if(confirm(`¿Restablecer contraseña de ${username} a: ${initial_password}?`)) {
        await fetch(`/api/users/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ username, initial_password }) });
        showNotification("Contraseña reseteada");
    }
}

async function cambiarPassword() {
    const newPassword = document.getElementById('new-password').value;
    if(!newPassword) return;
    await fetch('/cambiar-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ newPassword }) });
    showNotification("Contraseña actualizada");
    cerrarModal('settings-modal');
}

function mostrarNombre() {
    const input = document.getElementById('inputArchivo');
    if(input.files.length > 0) document.getElementById('file-name').innerText = "📄 " + input.files[0].name;
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('drive-theme', isLight ? 'light' : 'dark');
    document.getElementById('theme-toggle').innerText = isLight ? '🌙' : '☀️';
}

function loadTheme() {
    if (localStorage.getItem('drive-theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').innerText = '🌙';
    }
}

window.onload = () => { loadTheme(); checkAuth(); };