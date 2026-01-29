// CONFIGURACIÓN
const SHEET_ID = '1H1V16M8t4DEisinvOCULe-HH7-Z6SZaR5RvvZovmiOY';

// Estado global
let appState = {
    bodegas: {},
    lastUpdate: null,
    dataLoaded: false
};

// CONFIGURACIÓN PWA
// CONFIGURACIÓN PWA CON INSTALACIÓN SILENCIOSA
function setupPWA() {
    console.log('🚀 Configurando PWA...');

    let deferredPrompt;

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado:', registration);
            })
            .catch((error) => {
                console.log('❌ Error en Service Worker:', error);
            });
    }

    // Detectar cuándo la app está lista para instalar
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('📱 PWA lista para instalación');
        e.preventDefault();
        deferredPrompt = e;

        // La instalación estará disponible automáticamente
        // El usuario puede instalar desde el menú del navegador

        // Opcional: Mostrar un indicador sutil después de un tiempo
        setTimeout(() => {
            showInstallHint();
        }, 10000); // 10 segundos
    });

    // Detectar si se instaló
    window.addEventListener('appinstalled', (evt) => {
        console.log('🎉 App instalada exitosamente');
        deferredPrompt = null;
    });
}

// Indicador sutil de instalación (opcional)
function showInstallHint() {
    // Solo mostrar si está en móvil y no está ya instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return; // Ya está instalada
    }

    if (!window.matchMedia('(max-width: 768px)').matches) {
        return; // No es móvil
    }

    console.log('💡 Sugerencia: Puedes instalar esta app desde el menú del navegador');

    // Puedes agregar un tooltip sutil aquí si quieres
    // Pero por ahora solo el log para no ser intrusivo
}

// Detectar si está lista para instalar
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📱 App lista para instalar');

    // Mostrar banner de instalación después de 5 segundos
    setTimeout(() => {
        const installBanner = document.getElementById('install-banner');
        const installBtn = document.getElementById('install-btn');

        if (installBanner && installBtn) {
            installBanner.style.display = 'block';

            installBtn.addEventListener('click', async () => {
                installBanner.style.display = 'none';
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`📱 Usuario ${outcome} la instalación`);
                deferredPrompt = null;
            });
        }
    }, 5000);
});

// Detectar si se lanzó desde la pantalla de inicio
window.addEventListener('load', () => {
    if (window.navigator.standalone) {
        console.log('📱 App lanzada desde pantalla de inicio');
    }
});


// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Iniciando aplicación...");
    setupPWA(); // 🔥 NUEVO: Inicializar PWA
    setupRouting();
    setupSearch();
    loadData();
});

// Cargar datos del Google Sheets
// Cargar datos locales (JSON generado por VinosPOS)
async function loadData() {
    try {
        showLoading(true);

        // Cache busting para asegurar que se carguen los cambios recientes
        const url = `data/productos.json?t=${Date.now()}`;

        console.log('📥 Cargando catálogo local...');

        const response = await fetch(url);

        if (!response.ok) {
            // Fallback para depuración o si el archivo no existe
            console.warn('⚠️ No se encontró productos.json, usando modo demo o vacío');
            throw new Error(`No se encontró el catálogo de productos`);
        }

        const json = await response.json();

        // Check data structure (Array vs Object)
        let products = [];
        let featured = [];

        if (Array.isArray(json)) {
            // Old format
            products = json;
        } else if (json.catalogo) {
            // New format (v2)
            products = json.catalogo;
            featured = json.destacados || [];
        }

        processLocalData(products);

        // Render Featured if available
        if (featured.length > 0) {
            renderFeaturedProducts(featured);
        } else {
            // Hide featured section if empty
            const featuredContainer = document.getElementById('featured-section');
            if (featuredContainer) featuredContainer.style.display = 'none';
        }

        renderHomePage();

        appState.lastUpdate = new Date(json.lastUpdate || Date.now());
        appState.dataLoaded = true;
        updateLastUpdateTime();
        handleHashChange();

    } catch (error) {
        console.error('❌ Error:', error);
        showError(`Error: ${error.message}. Recarga la página.`);
    } finally {
        showLoading(false);
    }
}
// Procesar datos locales (Array de objetos)
function processLocalData(data) {
    const bodegas = {};

    // Data es un array: [{id, vino, bodega, precio, stock}, ...]
    if (!Array.isArray(data)) {
        console.error('Formato de datos inválido', data);
        return;
    }

    data.forEach(item => {
        const vino = item.vino || '';
        const bodega = item.bodega || 'Otras';
        const precio = item.precio || 0;

        if (vino) {
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

// Routing con hashtags
function setupRouting() {
    // Manejar cambios en el hash
    window.addEventListener('hashchange', handleHashChange);

    // Manejar popstate (navegación con botones atrás/adelante)
    window.addEventListener('popstate', handleHashChange);
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    console.log('Hash cambiado:', hash);

    // SI LOS DATOS NO ESTÁN CARGADOS, ESPERAR
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

// Renderizar Productos Destacados (Top 5)
function renderFeaturedProducts(featured) {
    const container = document.getElementById('featured-grid');
    const section = document.getElementById('featured-section');

    if (!container || !section) return;

    if (!featured || featured.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    featured.forEach(item => {
        const card = document.createElement('div');
        card.className = 'featured-card';
        card.innerHTML = `
            <div class="featured-badge">🔥 Top Ventas</div>
            <div class="featured-info">
                <h3>${item.vino}</h3>
                <p class="featured-bodega">${item.bodega}</p>
                <div class="featured-price">${formatPrecio(item.precio)}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// SISTEMA DE BÚSQUEDA
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    console.log("🔍 Inicializando búsqueda...", searchInput);

    if (!searchInput) {
        console.error("❌ No se encontró el input de búsqueda");
        return;
    }

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        console.log("🔍 Buscando:", searchTerm);

        if (searchTerm.length === 0) {
            console.log("🔍 Mostrando todas las bodegas");
            renderHomePage();
            return;
        }

        console.log("🔍 Filtrando vinos...");
        const vinosFiltrados = filterVinos(searchTerm);
        renderVinosFiltrados(vinosFiltrados, searchTerm);
    });

    console.log("✅ Búsqueda inicializada correctamente");
}

function filterVinos(searchTerm) {
    const vinosFiltrados = [];

    console.log("📊 Bodegas disponibles:", Object.keys(appState.bodegas));

    Object.keys(appState.bodegas).forEach(bodegaName => {
        const vinos = appState.bodegas[bodegaName];

        vinos.forEach(vino => {
            // Buscar por nombre de vino
            const matchVino = vino.vino.toLowerCase().includes(searchTerm);
            // Buscar por nombre de bodega
            const matchBodega = bodegaName.toLowerCase().includes(searchTerm);
            // Buscar por precio
            const precioTexto = vino.precio.toLowerCase();
            const matchPrecio = precioTexto.includes(searchTerm);

            if (matchVino || matchBodega || matchPrecio) {
                vinosFiltrados.push({
                    vino: vino.vino,
                    precio: vino.precio,
                    bodega: bodegaName
                });
            }
        });
    });

    console.log("🎯 Vinos encontrados:", vinosFiltrados.length);
    return vinosFiltrados;
}

function renderVinosFiltrados(vinosFiltrados, searchTerm) {
    const container = document.getElementById('bodegas-container');

    if (vinosFiltrados.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 60px 20px;">
                <div style="font-size: 4em; margin-bottom: 20px;">🔍</div>
                <p style="font-size: 1.4em; margin-bottom: 10px;">No se encontraron resultados</p>
                <p style="opacity: 0.8; font-size: 1.1em;">Probá con otro nombre de vino, bodega o precio</p>
                <p style="opacity: 0.6; margin-top: 10px;">Buscaste: "${searchTerm}"</p>
            </div>
        `;
        return;
    }

    // Agrupar vinos por bodega
    const vinosPorBodega = {};
    vinosFiltrados.forEach(vino => {
        if (!vinosPorBodega[vino.bodega]) {
            vinosPorBodega[vino.bodega] = [];
        }
        vinosPorBodega[vino.bodega].push(vino);
    });

    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; font-size: 1.8em; margin-bottom: 10px;">
                🔍 ${vinosFiltrados.length} resultados encontrados
            </h2>
            <p style="color: rgba(255,255,255,0.8);">Buscaste: "${searchTerm}"</p>
        </div>
    `;

    // Mostrar resultados agrupados por bodega
    Object.keys(vinosPorBodega).forEach(bodegaName => {
        const vinosDeBodega = vinosPorBodega[bodegaName];

        const bodegaSection = document.createElement('div');
        bodegaSection.className = 'search-result-group'; // New Class
        bodegaSection.style.gridColumn = '1 / -1';
        bodegaSection.style.marginBottom = '25px';

        bodegaSection.innerHTML = `
            <div class="bodega-card search-header" onclick="showBodegaPage('${bodegaName}')">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <h3 style="margin: 0; text-align: left;">${bodegaName}</h3>
                    <div class="wine-count-badge">
                        ${vinosDeBodega.length} productos
                    </div>
                </div>
            </div>
            <div class="search-items-grid">
                ${vinosDeBodega.map(vino => `
                    <div class="vino-card">
                        <div class="vino-name">${vino.vino}</div>
                        <div class="vino-price">${vino.precio}</div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(bodegaSection);
    });
}