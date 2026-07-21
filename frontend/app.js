let currentPath = '';
let actionData = {}; // Memoria para modales

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
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            checkAuth();
            showNotification("¡Bienvenido " + data.username + "!");
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
        if (res.ok) { showNotification('Subido con éxito'); input.value = ''; mostrarNombre(); cargarArchivos(currentPath); }
        else { res.status === 401 ? logout() : showNotification('Error al subir'); }
    } catch (e) { showNotification('Error de conexión'); }
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
        const isMedia = archivo.name.match(/\.(mp4|webm|ogg|mp3|wav|jpg|jpeg|png|gif|webp|pdf)$/i);
        const itemContainer = document.createElement('div');
        itemContainer.className = 'file-item-container';

        const item = document.createElement('div');
        item.className = 'file-item-main';
        
        let icon = archivo.isDirectory ? '📁' : '📄';
        if (isMedia && !archivo.isDirectory) icon = '👁️'; // Icono para los que tienen previsualización

        item.innerHTML = `${icon} &nbsp; ${archivo.name}`;
        
        item.onclick = () => {
            if (archivo.isDirectory) cargarArchivos(archivo.path);
            else if (isMedia) abrirVisor(archivo.path, archivo.name);
            else window.open(`/uploads/${archivo.path}`, '_blank');
        };
        itemContainer.appendChild(item);

        const actions = document.createElement('div');
        actions.className = 'file-actions';

        // Botón de descargar (Para todos, incluso invitados)
        if (!archivo.isDirectory) {
            const btnDownload = document.createElement('a');
            btnDownload.className = 'btn-icon';
            btnDownload.innerText = '⬇️';
            btnDownload.title = "Descargar";
            btnDownload.href = `/uploads/${archivo.path}`;
            btnDownload.download = archivo.name;
            actions.appendChild(btnDownload);
        }

        // Controles de Dueño / Admin
        if (token && (role === 'admin' || currentUser === archivo.owner)) {
            const switchContainer = document.createElement('div');
            switchContainer.className = 'switch-container';
            switchContainer.innerHTML = `
                <span class="switch-label">${archivo.is_public ? 'Público' : 'Privado'}</span>
                <label class="switch">
                    <input type="checkbox" ${archivo.is_public ? 'checked' : ''} onchange="toggleVisibilidad('${archivo.path}', this.checked)">
                    <span class="slider"></span>
                </label>
            `;

            const btnRename = document.createElement('button');
            btnRename.className = 'btn-icon'; btnRename.innerText = '✏️'; 
            btnRename.onclick = () => abrirRenombrar(archivo.path, archivo.name);

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-icon'; btnDelete.innerText = '🗑️'; 
            btnDelete.onclick = () => {
                actionData.pathToDelete = archivo.path;
                actionData.mode = 'file';
                mostrarAdvertencia("Eliminar Archivo", `¿Seguro que deseas eliminar ${archivo.name}?`, confirmarEliminar);
            };

            actions.append(switchContainer, btnRename, btnDelete);
        }
        
        if (actions.childNodes.length > 0) itemContainer.appendChild(actions);
        listaDiv.appendChild(itemContainer);
    });
}

// --- VISOR UNIVERSAL (AKKFLIX E IMÁGENES) ---
function abrirVisor(path, name) {
    const container = document.getElementById('media-container');
    const title = document.getElementById('akkflix-title');
    const downloadBtn = document.getElementById('download-media-btn');
    const ext = name.split('.').pop().toLowerCase();
    
    container.innerHTML = '';
    title.innerText = name;
    title.style.color = "var(--text-main)";
    downloadBtn.href = `/uploads/${path}`;
    downloadBtn.download = name;
    
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
        title.innerText = "AKKFLIX";
        title.style.color = "#e50914";
        container.innerHTML = `<video controls autoplay><source src="/uploads/${path}" type="video/${ext}"></video>`;
    } else if (['mp3', 'wav'].includes(ext)) {
        container.innerHTML = `<audio controls autoplay><source src="/uploads/${path}" type="audio/${ext}"></audio>`;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        container.innerHTML = `<img src="/uploads/${path}" style="max-width:100%; border-radius:8px; display:block; margin: 0 auto;">`;
    } else if (ext === 'pdf') {
        container.innerHTML = `<iframe src="/uploads/${path}" style="width:100%; height:60vh; border:none; border-radius:8px;"></iframe>`;
    }
    abrirModal('akkflix-modal');
}
function cerrarVisor() {
    document.getElementById('media-container').innerHTML = ''; 
    cerrarModal('akkflix-modal');
}

// --- FUNCIONES MODALES ---
function mostrarAdvertencia(titulo, texto, accionConfirmar) {
    document.getElementById('warning-title').innerText = titulo;
    document.getElementById('warning-text').innerText = texto;
    const btn = document.getElementById('warning-confirm-btn');
    btn.onclick = accionConfirmar;
    abrirModal('warning-modal');
}

function abrirCrearCarpeta() {
    document.getElementById('folder-name-input').value = '';
    abrirModal('create-folder-modal');
}

async function confirmarCrearCarpeta() {
    const folderName = document.getElementById('folder-name-input').value;
    if (!folderName) return showNotification("Escribe un nombre");
    await fetch('/crear-carpeta', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ currentPath, folderName }) });
    cerrarModal('create-folder-modal');
    cargarArchivos(currentPath);
}

async function confirmarEliminar() {
    if (actionData.mode === 'file') {
        await fetch('/eliminar', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ targetPath: actionData.pathToDelete }) });
        cargarArchivos(currentPath);
    } else if (actionData.mode === 'user') {
        await fetch(`/api/users/${actionData.userToDelete}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('drive-token') } });
        abrirDashboard();
    } else if (actionData.mode === 'reset') {
        await fetch(`/api/users/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ username: actionData.userToReset, initial_password: actionData.passToReset }) });
        showNotification("Contraseña reseteada");
    }
    cerrarModal('warning-modal');
}

function abrirRenombrar(path, name) {
    actionData.oldPath = path;
    document.getElementById('rename-input').value = name;
    abrirModal('rename-modal');
}

async function confirmarRenombrar() {
    const newName = document.getElementById('rename-input').value;
    if (!newName) return;
    await fetch('/renombrar', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ oldPath: actionData.oldPath, newName }) });
    cerrarModal('rename-modal');
    cargarArchivos(currentPath);
}

async function toggleVisibilidad(targetPath, isChecked) {
    const is_public = isChecked ? 1 : 0;
    await fetch('/visibilidad', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ targetPath, is_public }) });
    cargarArchivos(currentPath);
}

// --- PANEL ADMIN ---
async function abrirDashboard() {
    abrirModal('dashboard-modal');
    const res = await fetch('/api/users', { headers: { 'Authorization': localStorage.getItem('drive-token') } });
    if(!res.ok) return showNotification("Error al cargar usuarios");
    
    const users = await res.json();
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    users.forEach(u => {
        list.innerHTML += `
            <div class="user-item">
                <div class="user-info">👤 <span>${u.username}</span> <br> Pass: <b>${u.initial_password}</b></div>
                <div class="file-actions">
                    <button class="btn-icon" title="Resetear Pass" onclick="resetearPass('${u.username}', '${u.initial_password}')">🔄</button>
                    <button class="btn-icon" title="Eliminar" onclick="abrirEliminarUsuario('${u.username}')">🗑️</button>
                </div>
            </div>`;
    });
}

async function crearUsuario() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-userpass').value;
    if(!username || !password) return showNotification("Llenar campos");
    
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('drive-token') }, body: JSON.stringify({ username, password }) });
    if(res.ok) {
        document.getElementById('new-username').value = '';
        document.getElementById('new-userpass').value = '';
        showNotification("Usuario creado");
        abrirDashboard();
    } else {
        const data = await res.json();
        showNotification(data.error);
    }
}

function abrirEliminarUsuario(username) {
    actionData.userToDelete = username;
    actionData.mode = 'user';
    mostrarAdvertencia("Eliminar Usuario", `¿Seguro que deseas eliminar a ${username}?`, confirmarEliminar);
}

function resetearPass(username, initial_password) {
    actionData.userToReset = username;
    actionData.passToReset = initial_password;
    actionData.mode = 'reset';
    mostrarAdvertencia("Restablecer Contraseña", `¿Restablecer contraseña de ${username} a: ${initial_password}?`, confirmarEliminar);
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