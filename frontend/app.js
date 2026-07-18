let currentPath = '';

// Función para mostrar la notificación
function showNotification(msg) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = msg;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// Función corregida para subir archivos respetando la carpeta actual
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return showNotification('Selecciona un archivo');

    const formData = new FormData();
    // Ya no enviamos el path por formData, solo el archivo
    formData.append('archivo', input.files[0]);

    try {
        // Enviamos la ruta directamente en la URL para que multer la detecte a tiempo
        const url = `/subir?path=${encodeURIComponent(currentPath)}`;
        const res = await fetch(url, { method: 'POST', body: formData });
        
        if (res.ok) {
            showNotification('Subido a: /' + (currentPath || 'Raíz'));
            input.value = '';
            document.getElementById('file-name').innerText = 'Ningún archivo';
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
        item.innerHTML = `${archivo.isDirectory ? '📁' : '📄'} ${archivo.name}`;
        
        if (archivo.isDirectory) {
            // Si es carpeta, navegamos hacia adentro
            item.onclick = () => cargarArchivos(archivo.path);
        } else {
            // Si es archivo, lo abrimos en una nueva pestaña usando la ruta estática
            item.onclick = () => window.open(`/uploads/${archivo.path}`, '_blank');
        }
        
        listaDiv.appendChild(item);
    });
}

function mostrarNombre() {
    document.getElementById('file-name').innerText = document.getElementById('inputArchivo').files[0].name;
}

window.onload = () => cargarArchivos();