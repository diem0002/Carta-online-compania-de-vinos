// CONFIGURACIÓN
const SHEET_ID = '1H1V16M8t4DEisinvOCULe-HH7-Z6SZaR5RvvZovmiOY';

// Estado global
let appState = {
    bodegas: {},
    lastUpdate: null,
    dataLoaded: false
};

// PWA Setup
function setupPWA() {
    console.log('🚀 Configurando PWA...');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ SW registrado:', reg))
            .catch(err => console.log('❌ SW Error:', err));
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            const banner = document.getElementById('install-banner');
            const btn = document.getElementById('install-btn');
            if (banner && btn) {
                banner.style.display = 'block';
                btn.onclick = async () => {
                    banner.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt = null;
                };
            }
        }, 5000);
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Init...");
    setupPWA();
    setupRouting();
    setupSearch();
    loadData();
});

// Cargar Datos
async function loadData() {
    try {
        showLoading(true);
        // Cache busting
        const url = `data/productos.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se encontró el catálogo");

        const json = await response.json();
        let products = json.catalogo || (Array.isArray(json) ? json : []);
        let featured = json.destacados || [];

        processLocalData(products);

        // Render Featured
        if (featured.length > 0) {
            renderFeaturedProducts(featured);
        } else {
            const fs = document.getElementById('featured-section');
            if (fs) fs.style.display = 'none';
        }

        renderHomePage();

        appState.lastUpdate = new Date(json.lastUpdate || Date.now());
        appState.dataLoaded = true;
        updateLastUpdateTime();
        handleHashChange(); // Procesar URL inicial

    } catch (e) {
        console.error(e);
        showError(e.message);
    } finally {
        showLoading(false);
    }
}

function processLocalData(data) {
    const bodegas = {};
    if (!Array.isArray(data)) return;

    data.forEach(item => {
        const vino = item.vino || '';
        const bodega = item.bodega || 'Otras';
        const precio = item.precio || 0;

        if (vino) {
            if (!bodegas[bodega]) bodegas[bodega] = [];
            bodegas[bodega].push({ vino, precio: formatPrecio(precio) });
        }
    });
    appState.bodegas = bodegas;
}

function formatPrecio(p) {
    if (typeof p === 'number') return `$${p.toLocaleString('es-AR')}`;
    if (typeof p === 'string' && p.trim() !== '') return `$${p}`;
    return 'Consultar';
}

// Render Home
function renderHomePage() {
    const container = document.getElementById('bodegas-container');
    const bodegas = appState.bodegas;
    container.innerHTML = '';

    Object.keys(bodegas).sort().forEach(bodegaName => {
        const vinos = bodegas[bodegaName];
        const card = document.createElement('div');
        card.className = 'bodega-card';
        card.onclick = () => showBodegaPage(bodegaName);
        card.innerHTML = `<h3>${bodegaName}</h3><p class="wine-count">${vinos.length} vinos disponibles</p>`;
        container.appendChild(card);
    });
}

// Render Bodega (MODAL CONTENT)
function renderBodegaPage(bodegaName) {
    const vinos = appState.bodegas[bodegaName] || [];
    const container = document.getElementById('vinos-container');
    document.getElementById('bodega-name').textContent = bodegaName;
    container.innerHTML = '';

    if (vinos.length === 0) {
        container.innerHTML = '<div class="error">No hay vinos disponibles</div>';
        return;
    }

    vinos.sort((a, b) => a.vino.localeCompare(b.vino)).forEach(vino => {
        const div = document.createElement('div');
        div.className = 'vino-card';
        div.innerHTML = `<div class="vino-name">${vino.vino}</div><div class="vino-price">${vino.precio}</div>`;
        container.appendChild(div);
    });
}

// === NAVIGATION LOGIC (MODAL) ===
function showPage(pageId) {
    // Si vamos a HOME, ocultamos el modal BODEGA y aseguramos HOME visible
    if (pageId === 'home') {
        document.getElementById('bodega').classList.remove('active');
        document.getElementById('home').classList.add('active'); // Ensure base layer visible
        // Limpiar hash URL al cerrar modal
        if (window.location.hash.includes('bodega')) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
        return;
    }

    // Si vamos a BODEGA, activamos el modal (z-index 9999 manejará la superposición)
    if (pageId === 'bodega') {
        document.getElementById('bodega').classList.add('active');
        window.scrollTo(0, 0); // Scroll del modal al top (si fuera necesario, aunque el modal tiene su propio scroll)
        // Check CSS: #bodega { overflow-y: auto; }
        const bodegaEl = document.getElementById('bodega');
        if (bodegaEl) bodegaEl.scrollTop = 0;
    }
}

function showBodegaPage(name) {
    // 1. Render content
    renderBodegaPage(name);
    // 2. Show Modal
    showPage('bodega');
    // 3. Update URL Hash (so refresh keeps modal open)
    const newHash = `#bodega-${encodeURIComponent(name)}`;
    if (window.location.hash !== newHash) {
        history.pushState(null, null, newHash);
    }
}

// Routing
function setupRouting() {
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // QR Support: ?bodega=NAME -> #bodega-NAME
    const params = new URLSearchParams(window.location.search);
    const qBodega = params.get('bodega');
    if (qBodega) {
        const newUrl = window.location.pathname + '#bodega-' + encodeURIComponent(qBodega);
        history.replaceState({}, '', newUrl);
        // handleHashChange will run on loadData or via event? No, replacing state won't trigger hashchange.
        // We will call handleHashChange manually in loadData
    }
}

function handleHashChange() {
    if (!appState.dataLoaded) return; // Wait for data

    const hash = window.location.hash.substring(1);
    if (hash.startsWith('bodega-')) {
        const name = decodeURIComponent(hash.replace('bodega-', ''));
        if (appState.bodegas[name]) {
            renderBodegaPage(name);
            showPage('bodega');
            return;
        }
    }
    showPage('home');
}

// Utilidades
function showLoading(show) {
    const l = document.getElementById('loading');
    const c = document.getElementById('bodegas-container');
    if (l) l.style.display = show ? 'block' : 'none';
    if (c) c.style.display = show ? 'none' : 'grid';
}
function showError(msg) {
    const c = document.getElementById('bodegas-container');
    if (c) c.innerHTML = `<div class="error">${msg}</div>`;
}
function updateLastUpdateTime() {
    const el = document.getElementById('update-time');
    if (el && appState.lastUpdate) el.textContent = appState.lastUpdate.toLocaleString('es-AR');
}

// Featured
function renderFeaturedProducts(featured) {
    const c = document.getElementById('featured-grid');
    const s = document.getElementById('featured-section');
    if (!c || !s) return;
    if (!featured || !featured.length) { s.style.display = 'none'; return; }
    s.style.display = 'block';
    c.innerHTML = '';
    featured.forEach(item => {
        const div = document.createElement('div');
        div.className = 'featured-card';
        div.innerHTML = `
            <div class="featured-badge">🔥 Top Ventas</div>
            <div class="featured-info">
                <h3>${item.vino}</h3>
                <p class="featured-bodega">${item.bodega}</p>
                <div class="featured-price">${formatPrecio(item.precio)}</div>
            </div>`;
        c.appendChild(div);
    });
}

// Search
function setupSearch() {
    const inp = document.getElementById('search-input');
    if (!inp) return;
    inp.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) { renderHomePage(); return; }
        const res = filterVinos(term);
        renderVinosFiltrados(res, term);
    });
}

function filterVinos(term) {
    const res = [];
    Object.keys(appState.bodegas).forEach(bName => {
        appState.bodegas[bName].forEach(v => {
            if (v.vino.toLowerCase().includes(term) || bName.toLowerCase().includes(term) || v.precio.toLowerCase().includes(term)) {
                res.push({ vino: v.vino, precio: v.precio, bodega: bName });
            }
        });
    });
    return res;
}

function renderVinosFiltrados(list, term) {
    const c = document.getElementById('bodegas-container');
    if (list.length === 0) {
        c.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-main)"><div style="font-size:4em;margin-bottom:20px">🔍</div><p style="font-size:1.4em">No se encontraron resultados</p><p style="opacity:0.6">Buscaste: "${term}"</p></div>`;
        return;
    }
    const grouped = {};
    list.forEach(v => { if (!grouped[v.bodega]) grouped[v.bodega] = []; grouped[v.bodega].push(v); });

    c.innerHTML = `<div style="grid-column:1/-1;text-align:center;margin-bottom:30px"><h2 style="color:var(--primary-color)">🔍 ${list.length} resultados</h2></div>`;

    Object.keys(grouped).forEach(bName => {
        const div = document.createElement('div');
        div.className = 'search-result-group';
        div.style.gridColumn = '1/-1';
        div.style.marginBottom = '25px';
        div.innerHTML = `
            <div class="bodega-card search-header" onclick="showBodegaPage('${bName}')">
                <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                    <h3 style="margin:0;text-align:left;color:var(--primary-color)">${bName}</h3>
                    <div class="wine-count-badge">${grouped[bName].length} productos</div>
                </div>
            </div>
            <div class="search-items-grid">
                ${grouped[bName].map(v => `<div class="vino-card"><div class="vino-name">${v.vino}</div><div class="vino-price">${v.precio}</div></div>`).join('')}
            </div>`;
        c.appendChild(div);
    });
}

window.showPage = showPage;
window.showBodegaPage = showBodegaPage;