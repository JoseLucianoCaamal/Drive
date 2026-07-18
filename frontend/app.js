// --- VARIABLES GLOBALES ---
let usuarioActual = localStorage.getItem('drive_usuario') || '';
let rolActual = localStorage.getItem('drive_rol') || '';

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Si ya hay sesión, vamos al dashboard. Si no, cargamos lo público y mostramos la vista pública.
    if (usuarioActual && rolActual) {
        activarDashboard(usuarioActual, rolActual);
    } else {
        cambiarVista('public-view');
        cargarArchivosPublicos();
    }
});

// Listener para el botón de subida (mostrar/ocultar)
document.getElementById('fileInput').addEventListener('change', function() {
    const btnUpload = document.getElementById('btn-upload');
    if (this.files.length > 0) {
        btnUpload.style.display = 'inline-block';
        btnUpload.innerText = `Subir: ${this.files[0].name}`;
    } else {
        btnUpload.style.display = 'none';
    }
});

// --- GESTIÓN DE VISTAS ---
function cambiarVista(vistaId) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(vistaId).classList.add('active');
}

function activarDashboard(user, rol) {
    usuarioActual = user;
    rolActual = rol;
    cambiarVista('dashboard-view');
    document.getElementById('user-display').innerText = `Hola, ${user}`;
    cargarArchivos();
}

// --- LÓGICA DE USUARIOS (Login/Logout) ---
async function iniciarSesion() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorText = document.getElementById('login-error');

    if (!user || !pass) { errorText.innerText = "Llena todos los campos"; return; }
    errorText.innerText = "Conectando..."; 

    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, password: pass })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
            localStorage.setItem('drive_usuario', datos.usuario);
            localStorage.setItem('drive_rol', datos.rol);
            activarDashboard(datos.usuario, datos.rol);
        } else {
            errorText.innerText = datos.mensaje || "Credenciales incorrectas";
        }
    } catch (error) {
        errorText.innerText = "Error de conexión";
    }
}

function cerrarSesion() {
    localStorage.removeItem('drive_usuario');
    localStorage.removeItem('drive_rol');
    usuarioActual = ''; rolActual = '';
    location.reload(); // Recargamos para volver al estado inicial público
}

// --- LÓGICA DE ARCHIVOS (Públicos) ---
async function cargarArchivosPublicos() {
    const contenedor = document.getElementById('public-file-list');
    if (!contenedor) return;
    
    try {
        const respuesta = await fetch('/api/archivos-publicos');
        const archivos = await respuesta.json();
        contenedor.innerHTML = archivos.length === 0 ? "<p>No hay archivos públicos.</p>" : "";
        
        archivos.forEach(archivo => {
            const ruta = `/uploads/${archivo.propietario}/${archivo.nombre_fisico}`;
            const esImagen = archivo.tipo_mime?.startsWith('image/');
            contenedor.innerHTML += `
                <div class="file-card">
                    <a href="${ruta}" target="_blank" class="file-thumb">
                        ${esImagen ? `<img src="${ruta}" loading="lazy">` : `<span class="material-symbols-outlined">description</span>`}
                    </a>
                    <p>${archivo.nombre_original}</p>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

// --- LÓGICA DE ARCHIVOS (Privados/Dashboard) ---
async function cargarArchivos() {
    const contenedor = document.getElementById('file-list');
    contenedor.innerHTML = "<p>Cargando archivos...</p>";

    try {
        const respuesta = await fetch('/api/archivos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, rol: rolActual })
        });
        
        const archivos = await respuesta.json();
        contenedor.innerHTML = "";

        archivos.forEach(archivo => {
            const ruta = `/uploads/${archivo.propietario}/${archivo.nombre_fisico}`;
            const esPublico = archivo.visibilidad === 'publico';
            
            contenedor.innerHTML += `
                <div class="file-card">
                    <a href="${ruta}" target="_blank" class="file-thumb">
                        ${archivo.tipo_mime?.startsWith('image/') ? `<img src="${ruta}" loading="lazy">` : `<span class="material-symbols-outlined">description</span>`}
                    </a>
                    <div class="file-info">
                        <span>${archivo.nombre_original}</span>
                        <button onclick="cambiarVisibilidad(${archivo.id}, '${archivo.visibilidad}')" 
                                style="color: ${esPublico ? '#10b981' : '#64748b'}">
                            <span class="material-symbols-outlined">${esPublico ? 'public' : 'lock'}</span>
                        </button>
                    </div>
                </div>`;
        });
    } catch (e) { contenedor.innerHTML = "<p>Error al cargar.</p>"; }
}

async function subirArchivo() {
    const input = document.getElementById('fileInput');
    if (input.files.length === 0) return;

    const formData = new FormData();
    formData.append('archivoDelUsuario', input.files[0]);
    formData.append('usuario', usuarioActual); 

    try {
        const respuesta = await fetch('/subir', { method: 'POST', body: formData });
        if (respuesta.ok) {
            input.value = ""; 
            document.getElementById('btn-upload').style.display = 'none';
            cargarArchivos();
        }
    } catch (e) { console.error(e); }
}

async function cambiarVisibilidad(id, actual) {
    const nueva = actual === 'publico' ? 'privado' : 'publico';
    await fetch('/api/cambiar-visibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, visibilidad: nueva })
    });
    cargarArchivos();
}