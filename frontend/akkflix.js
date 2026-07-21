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

function checkAuth() {
    const token = localStorage.getItem('drive-token');
    if (token) {
        document.getElementById('btn-upload-movie').style.display = 'inline-block';
    }
}

async function cargarCatalogo() {
    const token = localStorage.getItem('drive-token');
    const res = await fetch('/api/akkflix', {
        headers: token ? { 'Authorization': token } : {}
    });
    const peliculas = await res.json();
    const grid = document.getElementById('movie-grid');
    grid.innerHTML = '';

    if(peliculas.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="text-align:center; grid-column: 1 / -1;">No hay títulos disponibles aún.</p>';
        return;
    }

    peliculas.forEach(peli => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <span class="movie-badge">${peli.genre || 'Película'}</span>
            <img class="movie-poster" src="/uploads/${peli.cover_path}" alt="Portada" onerror="this.src='/Img/akko.png'">
            <div class="movie-info">
                <h3 class="movie-title">${peli.title}</h3>
            </div>
        `;
        card.onclick = () => mostrarDetalles(peli);
        grid.appendChild(card);
    });
}

function mostrarDetalles(peli) {
    const content = document.getElementById('movie-detail-content');
    content.innerHTML = `
        <img class="detail-poster" src="/uploads/${peli.cover_path}" onerror="this.src='/Img/akko.png'">
        <div class="detail-info">
            <h2 class="detail-title">${peli.title}</h2>
            <span class="badge" style="background: rgba(229, 9, 20, 0.2); color: #e50914;">${peli.genre || 'General'}</span>
            <p class="detail-desc">${peli.description || 'Sin descripción disponible.'}</p>
            <p class="text-muted">Subido por: ${peli.owner}</p>
            <button class="btn-primary btn-play" onclick="reproducir('${peli.video_path}', '${peli.title}')">▶️ Reproducir</button>
        </div>
    `;
    abrirModal('movie-detail-modal');
}

function reproducir(path, title) {
    cerrarModal('movie-detail-modal');
    const container = document.getElementById('player-container');
    document.getElementById('player-title').innerText = title;
    const ext = path.split('.').pop().toLowerCase();
    container.innerHTML = `<video controls autoplay><source src="/uploads/${path}" type="video/${ext}"></video>`;
    abrirModal('player-modal');
}

function cerrarReproductor() {
    document.getElementById('player-container').innerHTML = ''; 
    cerrarModal('player-modal');
}

async function subirPelicula() {
    const title = document.getElementById('movie-title').value;
    const genre = document.getElementById('movie-genre').value;
    const desc = document.getElementById('movie-desc').value;
    const cover = document.getElementById('movie-cover').files[0];
    const video = document.getElementById('movie-video').files[0];

    if (!title || !video) return showNotification("El título y el video son obligatorios");

    const formData = new FormData();
    formData.append('title', title);
    formData.append('genre', genre);
    formData.append('description', desc);
    if(cover) formData.append('cover', cover);
    formData.append('video', video);

    try {
        showNotification("Subiendo... por favor espera.");
        const res = await fetch('/api/akkflix?path=Akkflix', { 
            method: 'POST', body: formData, headers: { 'Authorization': localStorage.getItem('drive-token') }
        });
        if (res.ok) { 
            showNotification('¡Película subida!'); 
            cerrarModal('upload-movie-modal');
            cargarCatalogo(); 
        } else showNotification('Error al subir');
    } catch (e) { showNotification('Error de conexión'); }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('drive-theme', isLight ? 'light' : 'dark');
    document.getElementById('theme-toggle').innerText = isLight ? '🌙' : '☀️';
}

window.onload = () => { 
    if (localStorage.getItem('drive-theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').innerText = '🌙';
    }
    checkAuth();
    cargarCatalogo();
};