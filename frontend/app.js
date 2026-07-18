let currentPath = ''; // Variable global para saber dónde estamos

// 1. Función para subir archivos
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return alert('Selecciona un archivo primero');

    const formData = new FormData();
    formData.append('archivo', input.files[0]);

    try {
        // Enviamos también la ruta actual para saber dónde guardar (opcional, por ahora a la raíz)
        const res = await fetch('/subir', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            alert('Subido correctamente');
            input.value = ''; // Limpiar el input
            cargarArchivos(currentPath); // Recargar la lista en la carpeta actual
        } else {
            alert('Error en el servidor');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
}

// 2. Función para listar y navegar
async function cargarArchivos(folderPath = '') {
    currentPath = folderPath;
    const res = await fetch(`/listar?path=${encodeURIComponent(folderPath)}`);
    const archivos = await res.json();
    const listaDiv = document.getElementById('file-list');
    
    listaDiv.innerHTML = ''; 

    // Botón "Volver atrás"
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
    
    // Listar archivos y carpetas
    archivos.forEach(archivo => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `${archivo.isDirectory ? '📁' : '📄'} ${archivo.name}`;
        
        if (archivo.isDirectory) {
            item.onclick = () => cargarArchivos(archivo.path);
        }
        listaDiv.appendChild(item);
    });
}

// Ejecutar al cargar la página
window.onload = () => cargarArchivos();