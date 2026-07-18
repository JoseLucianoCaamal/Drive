// 1. Al cargar la página, leemos la memoria del navegador
let usuarioActual = localStorage.getItem('drive_usuario') || '';
let rolActual = localStorage.getItem('drive_rol') || '';

document.addEventListener('DOMContentLoaded', () => {
    if (usuarioActual && rolActual) {
        activarDashboard(usuarioActual, rolActual);
    }
});

document.getElementById('fileInput').addEventListener('change', function() {
    const btnUpload = document.getElementById('btn-upload');
    if (this.files.length > 0) {
        btnUpload.style.display = 'inline-block';
        btnUpload.innerText = `Subir: ${this.files[0].name}`;
    } else {
        btnUpload.style.display = 'none';
    }
});

async function iniciarSesion() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorText = document.getElementById('login-error');

    if (!user || !pass) { errorText.innerText = "Llena todos los campos"; return; }
    errorText.innerText = "Conectando..."; errorText.style.color = "#94a3b8";

    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, password: pass })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
            usuarioActual = datos.usuario;
            rolActual = datos.rol;
            localStorage.setItem('drive_usuario', usuarioActual);
            localStorage.setItem('drive_rol', rolActual);
            activarDashboard(usuarioActual, rolActual);
        } else {
            errorText.innerText = datos.mensaje || "Credenciales incorrectas";
            errorText.style.color = "#ef4444";
        }
    } catch (error) {
        errorText.innerText = "Error de conexión con el servidor";
        errorText.style.color = "#ef4444";
    }
}

function activarDashboard(user, rol) {
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.add('active');
    
    let saludo = `Hola, ${user}`;
    if (rol === 'admin') {
        saludo += ` <span class="admin-badge" style="display:inline-block">Admin</span>`;
    }
    document.getElementById('user-display').innerHTML = saludo;
    cargarArchivos();
}

async function subirArchivo() {
    const input = document.getElementById('fileInput');
    const status = document.getElementById('upload-status');
    const btnUpload = document.getElementById('btn-upload');

    if (input.files.length === 0) return;

    const formData = new FormData();
    formData.append('archivoDelUsuario', input.files[0]);
    formData.append('usuario', usuarioActual); 

    status.innerText = "Subiendo archivo..."; status.style.color = "#3b82f6";

    try {
        const respuesta = await fetch('/subir', { method: 'POST', body: formData });
        if (respuesta.ok) {
            status.innerText = "¡Subida completada!"; status.style.color = "#10b981";
            input.value = ""; btnUpload.style.display = 'none';
            cargarArchivos();
            setTimeout(() => { status.innerText = ""; }, 3000);
        }
    } catch (error) {
        status.innerText = "Error al subir el archivo"; status.style.color = "#ef4444";
    }
}

// NUEVA FUNCIÓN: Alternar visibilidad
async function cambiarVisibilidad(id, estadoActual) {
    const nuevaVisibilidad = estadoActual === 'publico' ? 'privado' : 'publico';
    
    try {
        const respuesta = await fetch('/api/cambiar-visibilidad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, visibilidad: nuevaVisibilidad })
        });
        
        if (respuesta.ok) {
            cargarArchivos(); // Recargamos para ver el cambio de ícono
        }
    } catch (error) {
        console.error("Error al cambiar visibilidad:", error);
    }
}

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

        if (archivos.length === 0) {
            contenedor.innerHTML = "<p style='color: #94a3b8; grid-column: 1/-1; text-align: center;'>Aún no hay archivos aquí.</p>";
            return;
        }

        archivos.forEach(archivo => {
            const esImagen = archivo.tipo_mime && archivo.tipo_mime.startsWith('image/');
            const rutaArchivo = `/uploads/${archivo.propietario}/${archivo.nombre_fisico}`;
            
            // Lógica de visibilidad
            const esPublico = archivo.visibilidad === 'publico';
            const iconoVisibilidad = esPublico ? 'public' : 'lock';
            const colorVisibilidad = esPublico ? '#10b981' : '#64748b'; // Verde para público, gris para privado

            const miniatura = esImagen 
                ? `<img src="${rutaArchivo}" alt="${archivo.nombre_original}" loading="lazy">`
                : `<span class="material-symbols-outlined icon-doc">description</span>`;

            const tarjeta = `
                <div class="file-card">
                    <a href="${rutaArchivo}" target="_blank" class="file-thumb">
                        ${miniatura}
                    </a>
                    <div class="file-info">
                        <span class="file-name" title="${archivo.nombre_original}">${archivo.nombre_original}</span>
                        <div class="file-meta">
                            <button onclick="cambiarVisibilidad(${archivo.id}, '${archivo.visibilidad}')" style="background:none; border:none; cursor:pointer; color: ${colorVisibilidad}; padding: 5px;">
                                <span class="material-symbols-outlined" title="Cambiar visibilidad">${iconoVisibilidad}</span>
                            </button>
                            ${rolActual === 'admin' ? `<span>@${archivo.propietario}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            contenedor.innerHTML += tarjeta;
        });

    } catch (error) {
        contenedor.innerHTML = "<p style='color: #ef4444;'>Error al cargar los archivos.</p>";
    }
}

function cerrarSesion() {
    usuarioActual = ''; rolActual = '';
    localStorage.removeItem('drive_usuario');
    localStorage.removeItem('drive_rol');
    document.getElementById('dashboard-view').classList.remove('active');
    document.getElementById('login-view').classList.add('active');
    document.getElementById('file-list').innerHTML = ''; 
}