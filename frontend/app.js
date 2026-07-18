let currentPath = '';

// Subir archivo a la ruta actual
async function subirArchivo() {
    const input = document.getElementById('inputArchivo');
    if (input.files.length === 0) return alert('Selecciona un archivo');

    const formData = new FormData();
    formData.append('archivo', input.files[0]);
    formData.append('path', currentPath); // Envía la ruta donde estás parado

    const res = await fetch('/subir', { method: 'POST', body: formData });
    if (res.ok) {
        alert('Subido con éxito');
        input.value = '';
        document.getElementById('file-name').innerText = 'Ningún archivo';
        cargarArchivos(currentPath);
    } else {
        alert('Error en el servidor');
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
            item.onclick = () => cargarArchivos(archivo.path);
        }
        listaDiv.appendChild(item);
    });
}

function mostrarNombre() {
    document.getElementById('file-name').innerText = document.getElementById('inputArchivo').files[0].name;
}

window.onload = () => cargarArchivos();