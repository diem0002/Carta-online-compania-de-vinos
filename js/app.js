// CONFIGURACIÓN
const SHEET_ID = '1imP4FAq7Ar2P2o3ZOx2G3lyaAtRL8Hgz';

// Estado global
let appState = {
    bodegas: {},
    lastUpdate: null,
    dataLoaded: false // 🔥 NUEVO: para saber cuando los datos están listos
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    setupRouting(); // 🔥 PRIMERO el routing, después cargar datos
    loadData();
});

// Cargar datos del Google Sheets
async function loadData() {
    try {
        showLoading(true);
        
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        processSheetData(json);
        renderHomePage();
        
        appState.lastUpdate = new Date();
        appState.dataLoaded = true; // 🔥 MARCADOR: datos listos
        updateLastUpdateTime();
        
        // 🔥 IMPORTANTE: Procesar el hash DE NUEVO ahora que tenemos datos
        handleHashChange();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error cargando los datos. Recarga la página.');
    } finally {
        showLoading(false);
    }
}

// Procesar datos del sheet
function processSheetData(data) {
    const bodegas = {};
    
    data.table.rows.forEach((row, index) => {
        // Saltar la primera fila (headers)
        if (index === 0) return;
        
        const cells = row.c;
        if (!cells || cells.length < 3) return;
        
        const vino = cells[0]?.v || '';
        const bodega = cells[1]?.v || '';
        const precio = cells[2]?.v || '';
        
        if (vino && bodega) {
            if (!bodegas[bodega]) {
                bodegas[bodega] = [];
            }
            bodegas[bodega].push({
                vino: vino,
                precio: formatPrecio(precio)
            });
        }
    });
    
    appState.bodegas = bodegas;
    console.log('Bodegas procesadas:', Object.keys(bodegas));
}

// Formatear precio
function formatPrecio(precio) {
    if (typeof precio === 'number') {
        return `$${precio.toLocaleString('es-AR')}`;
    }
    if (typeof precio === 'string' && precio.trim() !== '') {
        return `$${precio}`;
    }
    return 'Consultar';
}

// Renderizar página principal
function renderHomePage() {
    const container = document.getElementById('bodegas-container');
    const bodegas = appState.bodegas;
    
    container.innerHTML = '';
    
    Object.keys(bodegas).sort().forEach(bodegaName => {
        const vinos = bodegas[bodegaName];
        const bodegaCard = document.createElement('div');
        bodegaCard.className = 'bodega-card';
        bodegaCard.onclick = () => showBodegaPage(bodegaName);
        
        bodegaCard.innerHTML = `
            <h3>${bodegaName}</h3>
            <p class="wine-count">${vinos.length} vinos disponibles</p>
        `;
        
        container.appendChild(bodegaCard);
    });
}

// Renderizar página de bodega
function renderBodegaPage(bodegaName) {
    const vinos = appState.bodegas[bodegaName] || [];
    const container = document.getElementById('vinos-container');
    
    document.getElementById('bodega-name').textContent = bodegaName;
    
    container.innerHTML = '';
    
    if (vinos.length === 0) {
        container.innerHTML = '<div class="error">No hay vinos disponibles para esta bodega</div>';
        return;
    }
    
    vinos.sort((a, b) => a.vino.localeCompare(b.vino)).forEach(vino => {
        const vinoCard = document.createElement('div');
        vinoCard.className = 'vino-card';
        vinoCard.innerHTML = `
            <div class="vino-name">${vino.vino}</div>
            <div class="vino-price">${vino.precio}</div>
        `;
        container.appendChild(vinoCard);
    });
}

// Navegación entre páginas
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showBodegaPage(bodegaName) {
    console.log('Mostrando bodega:', bodegaName);
    renderBodegaPage(bodegaName);
    showPage('bodega');
    
    // Actualizar URL
    const newUrl = `#bodega-${encodeURIComponent(bodegaName)}`;
    window.history.pushState({}, '', newUrl);
}

// Routing con hashtags - CORREGIDO
function setupRouting() {
    // Manejar cambios en el hash
    window.addEventListener('hashchange', handleHashChange);
    
    // Manejar popstate (navegación con botones atrás/adelante)
    window.addEventListener('popstate', handleHashChange);
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    console.log('Hash cambiado:', hash);
    
    // 🔥 SI LOS DATOS NO ESTÁN CARGADOS, ESPERAR
    if (!appState.dataLoaded) {
        console.log('Esperando a que se carguen los datos...');
        return;
    }
    
    if (hash.startsWith('bodega-')) {
        const bodegaName = decodeURIComponent(hash.replace('bodega-', ''));
        console.log('Bodega desde hash:', bodegaName);
        
        if (appState.bodegas[bodegaName]) {
            renderBodegaPage(bodegaName);
            showPage('bodega');
            return;
        } else {
            console.log('Bodega no encontrada:', bodegaName);
        }
    }
    
    // Si no hay hash válido, mostrar home
    showPage('home');
}

// Utilidades
function showLoading(show) {
    const loading = document.getElementById('loading');
    const container = document.getElementById('bodegas-container');
    
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (container) container.style.display = show ? 'none' : 'grid';
}

function showError(message) {
    const container = document.getElementById('bodegas-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

function updateLastUpdateTime() {
    const element = document.getElementById('update-time');
    if (element && appState.lastUpdate) {
        element.textContent = appState.lastUpdate.toLocaleString('es-AR');
    }
}

// Hacer funciones globales para el HTML
window.showPage = showPage;
window.showBodegaPage = showBodegaPage;