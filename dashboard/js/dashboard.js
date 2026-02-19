/**
 * Jewelry Dashboard — Main Application
 * Standalone SPA — zero jQuery, zero WordPress dependency.
 * Uses WooCommerce REST API via JewdAPI layer.
 *
 * @version 2.0.0
 */
(function () {
    'use strict';

    /* ===== STATE ===== */
    const state = {
        products: [],
        variations: {},  // productId -> variations[]
        stats: null,
        opened: {},
        page: 1,
        perPage: 50,
        totalPages: 1,
        total: 0,
        totalAll: 0,
        loading: false,
        allExpanded: false,
        categories: [],
        connected: false,
    };

    /* ===== DOM REFS ===== */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    /* ===== INIT ===== */
    document.addEventListener('DOMContentLoaded', async () => {
        const cfg = window.JEWD_CONFIG || {};
        state.perPage = cfg.perPage || 50;

        $('#versionTag').textContent = 'v' + (cfg.version || '2.0.0');
        $('#btnWPAdmin').href = cfg.adminUrl || '#';

        initTheme();
        bindEvents();
        await testConnection();
        loadCategories();
        loadStats();
        loadProducts();
    });

    /* ===== CONNECTION TEST ===== */
    async function testConnection() {
        const el = $('#connectionStatus');
        try {
            const ok = await JewdAPI.testConnection();
            state.connected = ok;
            el.className = 'jewd-connection ' + (ok ? 'jewd-conn-ok' : 'jewd-conn-err');
            $('#connText').textContent = ok
                ? 'Conectado a WooCommerce REST API'
                : 'Error de conexión — verifica API keys';
        } catch (e) {
            state.connected = false;
            el.className = 'jewd-connection jewd-conn-err';
            $('#connText').textContent = 'Sin conexión: ' + e.message;
        }
    }

    /* ===== THEME ===== */
    function initTheme() {
        const saved = localStorage.getItem('jewd_theme');
        if (saved === 'light') {
            $('#jewd-app').classList.add('jewd-light');
        }
        updateThemeIcon();
    }

    function toggleTheme() {
        $('#jewd-app').classList.toggle('jewd-light');
        const isLight = $('#jewd-app').classList.contains('jewd-light');
        localStorage.setItem('jewd_theme', isLight ? 'light' : 'dark');
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const isLight = $('#jewd-app').classList.contains('jewd-light');
        $('#btnTheme').textContent = isLight ? '☀️' : '🌙';
    }

    /* ===== EVENTS ===== */
    function bindEvents() {
        $('#btnTheme').addEventListener('click', toggleTheme);
        $('#btnRefresh').addEventListener('click', () => {
            loadStats();
            loadProducts();
            toast('Datos actualizados');
        });
        $('#btnExpandAll').addEventListener('click', toggleExpandAll);
        $('#btnExportJSON').addEventListener('click', exportJSON);
        $('#btnExportCSV').addEventListener('click', exportCSV);

        // Filters with debounce.
        let debounceTimer;
        $('#filterSearch').addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.page = 1;
                loadProducts();
            }, 400);
        });

        for (const sel of ['#filterCategory', '#filterType', '#filterStock']) {
            $(sel).addEventListener('change', () => {
                state.page = 1;
                loadProducts();
            });
        }

        // Modal close.
        $('#modalClose').addEventListener('click', closeModal);
        $('#modalCloseBtn').addEventListener('click', closeModal);
        $('#detailModal').addEventListener('click', (e) => {
            if (e.target === $('#detailModal')) closeModal();
        });

        // Image modal.
        $('#imgModal').addEventListener('click', () => {
            $('#imgModal').classList.remove('active');
        });

        // Keyboard.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                $('#imgModal').classList.remove('active');
            }
        });
    }

    /* ===== LOAD CATEGORIES ===== */
    async function loadCategories() {
        try {
            const res = await JewdAPI.getCategories();
            state.categories = res.data;
            populateCategoryFilter(res.data);
        } catch (e) {
            console.error('Error loading categories:', e);
        }
    }

    /* ===== LOAD STATS ===== */
    async function loadStats() {
        try {
            const res = await JewdAPI.getStats();
            state.stats = res.data;
            state.totalAll = res.data.total_products || 0;
            renderStats(res.data);
        } catch (e) {
            console.error('Error loading stats:', e);
            // Stats endpoint may not exist yet — show basic stats
            $('#statsContainer').innerHTML = statCard('Info', '—', 'Stats endpoint no disponible');
        }
    }

    function renderStats(s) {
        let html = '';
        html += statCard('Productos', s.total_products, s.total_variable + ' variable · ' + s.total_simple + ' simple');
        html += statCard('Variaciones', s.total_variations, 'en ' + s.total_variable + ' productos');
        html += statCard('Stock Total', s.total_stock, 'unidades', s.total_stock > 0 ? 'jewd-stat-success' : '');
        html += statCard('Categorías', Object.keys(s.categories || {}).length, catNames(s.categories));
        html += statCard('Rango Precios', '$' + fmtN(s.min_price), 'hasta $' + fmtN(s.max_price));
        html += statCard('Valor Inventario', '$' + fmtN(s.total_value), 'al precio actual', 'jewd-stat-success');
        html += statCard('Stock Bajo', s.low_stock, 'items ≤ 2 unidades', s.low_stock > 0 ? 'jewd-stat-alert' : '');
        html += statCard('Sin Stock', s.out_of_stock, 'items agotados', s.out_of_stock > 0 ? 'jewd-stat-alert' : '');

        $('#statsContainer').innerHTML = html;
    }

    function statCard(label, value, sub, extraClass) {
        return `<div class="jewd-stat ${extraClass || ''}">
            <div class="jewd-stat-label">${esc(label)}</div>
            <div class="jewd-stat-value">${value}</div>
            <div class="jewd-stat-sub">${sub || ''}</div>
        </div>`;
    }

    function catNames(cats) {
        if (!cats) return '';
        return Object.keys(cats).map(k => cats[k].name).join(', ');
    }

    function populateCategoryFilter(cats) {
        const sel = $('#filterCategory');
        const current = sel.value;
        // Remove all except first option.
        while (sel.options.length > 1) sel.remove(1);
        cats.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.name} (${cat.count})`;
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    }

    /* ===== LOAD PRODUCTS ===== */
    async function loadProducts() {
        if (state.loading) return;
        state.loading = true;

        const tb = $('#productsTable');
        tb.innerHTML = '<tr><td colspan="11" class="jewd-loading-row"><div class="jewd-spinner"></div> Cargando...</td></tr>';

        try {
            const res = await JewdAPI.getProducts({
                search: $('#filterSearch').value,
                category: $('#filterCategory').value,
                type: $('#filterType').value,
                stock: $('#filterStock').value,
                page: state.page,
                perPage: state.perPage,
            });

            state.products = res.data;
            state.total = res.total || res.data.length;
            state.totalPages = res.totalPages || 1;

            // Prefetch variations for variable products.
            const varProds = res.data.filter(p => p.type === 'variable');
            await Promise.all(varProds.map(async (p) => {
                if (!state.variations[p.id]) {
                    try {
                        const vRes = await JewdAPI.getVariations(p.id);
                        state.variations[p.id] = vRes.data;
                    } catch (e) {
                        state.variations[p.id] = [];
                    }
                }
            }));

            renderProducts();
            renderPagination();
            updateFilterCount();
        } catch (e) {
            tb.innerHTML = `<tr><td colspan="11" class="jewd-loading-row">Error: ${esc(e.message)}</td></tr>`;
        } finally {
            state.loading = false;
        }
    }

    /* ===== RENDER PRODUCTS ===== */
    function renderProducts() {
        const products = state.products;
        let html = '';
        const cfg = window.JEWD_CONFIG || {};

        if (!products.length) {
            html = '<tr><td colspan="11" class="jewd-empty">🔍<br>No se encontraron productos</td></tr>';
            $('#productsTable').innerHTML = html;
            return;
        }

        products.forEach((p, idx) => {
            const vs = state.variations[p.id] || [];
            const hasV = p.type === 'variable';
            const isOpen = state.opened[p.id];

            // Stock total for variable products.
            let vStock = 0;
            if (hasV) vs.forEach(v => { vStock += (v.stock_quantity || 0); });

            // Attributes summary.
            let attrs = '';
            if (p.attributes && p.attributes.length) {
                attrs = p.attributes.map(a => `${a.name}: ${a.options.join(', ')}`).join(' | ');
            }

            // Image.
            const imgSrc = p.images && p.images.length ? p.images[0].src : '';
            const imgHtml = imgSrc
                ? `<img class="jewd-thumb" src="${esc(imgSrc)}" data-full="${esc(imgSrc)}" onerror="this.outerHTML='<span class=jewd-nopic>N/A</span>'">`
                : '<span class="jewd-nopic">N/A</span>';

            // Price.
            let priceHtml = '';
            if (hasV) {
                priceHtml = `$${fmtN(p.price)}`;
                if (vs.length) {
                    const prices = vs.map(v => parseFloat(v.price) || 0).filter(x => x > 0);
                    if (prices.length) {
                        priceHtml = `$${fmtN(Math.min(...prices))} – $${fmtN(Math.max(...prices))}`;
                    }
                }
            } else {
                if (p.sale_price && p.sale_price !== p.regular_price) {
                    priceHtml = `<span class="jewd-price-sale">$${fmtN(p.regular_price)}</span><span class="jewd-price-current">$${fmtN(p.sale_price)}</span>`;
                } else {
                    priceHtml = `<span class="jewd-price-current">$${fmtN(p.price)}</span>`;
                }
            }

            // Sale column.
            let saleHtml = '—';
            if (!hasV && p.sale_price && p.sale_price !== p.regular_price) {
                saleHtml = `<span class="jewd-price-current">$${fmtN(p.sale_price)}</span>`;
            }

            // Categories.
            const catStr = (p.categories || []).map(c => c.name).join(', ');

            // Stock.
            let stockHtml = '';
            if (hasV) {
                const sc = vStock > 0 ? (vStock <= 5 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                stockHtml = `<span class="${sc}">${vStock}</span>`;
            } else if (p.stock_quantity !== null && p.stock_quantity !== undefined) {
                const sc = p.stock_quantity > 0 ? (p.stock_quantity <= 2 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                stockHtml = `<span class="${sc}">${p.stock_quantity}</span>`;
            } else {
                stockHtml = `<span class="jewd-stock-in">${esc(p.stock_status)}</span>`;
            }

            // Status badge.
            const statusBadge = p.status !== 'publish'
                ? ` <span class="jewd-badge jewd-badge-draft">${esc(p.status)}</span>`
                : '';

            // Edit URL.
            const editUrl = `${cfg.adminUrl}/post.php?post=${p.id}&action=edit`;

            // Build row.
            html += '<tr class="jewd-prow">';
            html += `<td>${hasV ? `<button class="jewd-expand-btn${isOpen ? ' open' : ''}" data-id="${p.id}" title="${vs.length} variaciones">▶</button>` : ''}</td>`;
            html += `<td>${imgHtml}</td>`;
            html += `<td class="jewd-sku">${esc(p.sku || '')}</td>`;
            html += `<td><strong>${esc(p.name)}</strong>${statusBadge}`;
            if (attrs) html += `<br><span style="font-size:.7rem;color:var(--jewd-text2)">${esc(attrs)}</span>`;
            html += '</td>';
            html += `<td><span class="jewd-badge jewd-badge-${hasV ? 'var' : 'sim'}">${esc(p.type)}</span>`;
            if (hasV) html += `<span style="font-size:.7rem;color:var(--jewd-text2);margin-left:4px">(${vs.length})</span>`;
            html += '</td>';
            html += `<td>${esc(catStr)}</td>`;
            html += `<td class="jewd-right">${priceHtml}</td>`;
            html += `<td class="jewd-right">${saleHtml}</td>`;
            html += `<td class="jewd-right">${stockHtml}</td>`;
            html += `<td class="jewd-right">${esc(p.weight || '—')}</td>`;
            html += '<td class="jewd-center">';
            html += `<button class="jewd-action-btn" data-action="detail" data-idx="${idx}" title="Ver detalle">👁</button>`;
            html += `<a class="jewd-action-btn" href="${esc(editUrl)}" title="Editar en WooCommerce" target="_blank">✏️</a>`;
            html += `<a class="jewd-action-btn" href="${esc(p.permalink || '#')}" title="Ver en tienda" target="_blank">🔗</a>`;
            html += '</td>';
            html += '</tr>';

            // Variation rows.
            if (hasV && isOpen && vs.length) {
                vs.forEach(v => {
                    let vAttr = '';
                    if (v.attributes) {
                        vAttr = v.attributes.map(a => `${a.name}: ${a.option}`).join(', ');
                    }

                    let vPriceHtml;
                    if (v.sale_price && v.sale_price !== v.regular_price) {
                        vPriceHtml = `<span class="jewd-price-sale">$${fmtN(v.regular_price)}</span><span class="jewd-price-current">$${fmtN(v.sale_price)}</span>`;
                    } else {
                        vPriceHtml = `<span class="jewd-price-current">$${fmtN(v.price)}</span>`;
                    }

                    const vSaleHtml = (v.sale_price && v.sale_price !== v.regular_price)
                        ? `<span class="jewd-price-current">$${fmtN(v.sale_price)}</span>`
                        : '—';

                    let vStockHtml;
                    if (v.stock_quantity !== null && v.stock_quantity !== undefined) {
                        const vsc = v.stock_quantity > 0 ? (v.stock_quantity <= 2 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                        vStockHtml = `<span class="${vsc}">${v.stock_quantity}</span>`;
                    } else {
                        vStockHtml = '—';
                    }

                    html += '<tr class="jewd-vrow">';
                    html += '<td></td><td></td>';
                    html += `<td class="jewd-sku jewd-var-indent">↳ ${esc(v.sku || '')}</td>`;
                    html += `<td><span class="jewd-var-attr">${esc(vAttr)}</span></td>`;
                    html += '<td><span class="jewd-badge jewd-badge-v">var</span></td>';
                    html += '<td></td>';
                    html += `<td class="jewd-right">${vPriceHtml}</td>`;
                    html += `<td class="jewd-right">${vSaleHtml}</td>`;
                    html += `<td class="jewd-right">${vStockHtml}</td>`;
                    html += `<td class="jewd-right">${esc(v.weight || '—')}</td>`;
                    html += '<td></td>';
                    html += '</tr>';
                });
            }
        });

        const tb = $('#productsTable');
        tb.innerHTML = html;

        // Bind expand buttons.
        tb.querySelectorAll('.jewd-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                state.opened[id] ? delete state.opened[id] : (state.opened[id] = true);
                renderProducts();
            });
        });

        // Bind thumbnail clicks.
        tb.querySelectorAll('.jewd-thumb').forEach(img => {
            img.addEventListener('click', () => showImage(img.dataset.full || img.src));
        });

        // Bind detail buttons.
        tb.querySelectorAll('[data-action="detail"]').forEach(btn => {
            btn.addEventListener('click', () => showDetail(state.products[parseInt(btn.dataset.idx)]));
        });
    }

    /* ===== PAGINATION ===== */
    function renderPagination() {
        const pg = $('#pagination');
        if (state.totalPages <= 1) {
            pg.innerHTML = `<span>Mostrando ${state.products.length} de ${state.total} productos</span>`;
            return;
        }

        let html = `<span>Página ${state.page} de ${state.totalPages} (${state.total} productos)</span> `;
        html += `<button ${state.page <= 1 ? 'disabled' : ''} data-page="${state.page - 1}">« Anterior</button>`;

        const start = Math.max(1, state.page - 2);
        const end = Math.min(state.totalPages, state.page + 2);
        for (let i = start; i <= end; i++) {
            html += `<button data-page="${i}"${i === state.page ? ' class="active"' : ''}>${i}</button>`;
        }

        html += `<button ${state.page >= state.totalPages ? 'disabled' : ''} data-page="${state.page + 1}">Siguiente »</button>`;

        pg.innerHTML = html;
        pg.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p && p !== state.page) {
                    state.page = p;
                    loadProducts();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    function updateFilterCount() {
        const total = state.totalAll || state.total;
        $('#filterCount').textContent = `${state.total} de ${total}`;
    }

    /* ===== EXPAND ALL ===== */
    function toggleExpandAll() {
        if (state.allExpanded) {
            state.opened = {};
            state.allExpanded = false;
            $('#btnExpandAll').innerHTML = '⊞ Expandir Todo';
        } else {
            state.products.forEach(p => {
                if (p.type === 'variable') state.opened[p.id] = true;
            });
            state.allExpanded = true;
            $('#btnExpandAll').innerHTML = '⊟ Colapsar Todo';
        }
        renderProducts();
    }

    /* ===== DETAIL MODAL ===== */
    function showDetail(p) {
        if (!p) return;
        const cfg = window.JEWD_CONFIG || {};
        const vs = state.variations[p.id] || [];

        $('#modalTitle').textContent = p.name;
        $('#modalEditLink').href = `${cfg.adminUrl}/post.php?post=${p.id}&action=edit`;
        $('#modalViewLink').href = p.permalink || '#';

        let html = '<div class="jewd-detail-grid">';
        html += detailField('ID', p.id);
        html += detailField('Tipo', p.type);
        html += detailField('SKU', p.sku || '—', true, 'sku');
        html += detailField('Estado', p.status);
        html += detailField('Categorías', (p.categories || []).map(c => c.name).join(', ') || '—');
        html += detailField('Tags', (p.tags || []).map(t => t.name).join(', ') || '—');

        if (p.type === 'variable' && vs.length) {
            const prices = vs.map(v => parseFloat(v.price) || 0).filter(x => x > 0);
            html += detailField('Precio Rango', prices.length ? `$${fmtN(Math.min(...prices))} — $${fmtN(Math.max(...prices))}` : '—');
            html += detailField('Variaciones', vs.length);
        } else {
            html += detailField('Precio Regular', `$${fmtN(p.regular_price)}`);
            html += detailField('Precio Oferta', p.sale_price ? `$${fmtN(p.sale_price)}` : '—');
            html += detailField('Stock', p.stock_quantity !== null ? p.stock_quantity : p.stock_status);
            html += detailField('Peso', p.weight || '—');
        }

        html += detailField('Fecha Creación', p.date_created ? p.date_created.split('T')[0] : '—');

        // Image.
        if (p.images && p.images.length) {
            html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Imagen</div>
                <div><img src="${esc(p.images[0].src)}" style="max-width:200px;border-radius:8px;cursor:pointer;border:1px solid var(--jewd-border)" onclick="document.getElementById('imgModalSrc').src=this.src;document.getElementById('imgModal').classList.add('active')"></div></div>`;
        }

        // Attributes.
        if (p.attributes && p.attributes.length) {
            const attrStr = p.attributes.map(a => `<strong>${esc(a.name)}:</strong> ${a.options.join(', ')}`).join('<br>');
            html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Atributos</div>
                <div class="jewd-detail-value">${attrStr}</div></div>`;
        }

        // Short description.
        if (p.short_description) {
            html += detailField('Descripción Corta', p.short_description, true);
        }

        // Variations table.
        if (vs.length) {
            html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Variaciones (${vs.length})</div>`;
            html += '<div style="overflow-x:auto;margin-top:6px"><table class="jewd-table" style="font-size:.78rem">';
            html += '<thead><tr><th>SKU</th><th>Atributos</th><th class="jewd-right">Precio</th><th class="jewd-right">Oferta</th><th class="jewd-right">Stock</th><th class="jewd-right">Peso</th></tr></thead><tbody>';
            vs.forEach(v => {
                const va = v.attributes ? v.attributes.map(a => `${a.name}: ${a.option}`).join(', ') : '';
                html += '<tr>';
                html += `<td class="jewd-sku">${esc(v.sku || '')}</td>`;
                html += `<td class="jewd-var-attr">${esc(va)}</td>`;
                html += `<td class="jewd-right">${v.regular_price ? '$' + fmtN(v.regular_price) : '$' + fmtN(v.price)}</td>`;
                html += `<td class="jewd-right">${v.sale_price ? '$' + fmtN(v.sale_price) : '—'}</td>`;
                html += `<td class="jewd-right">${v.stock_quantity !== null ? v.stock_quantity : '—'}</td>`;
                html += `<td class="jewd-right">${v.weight || '—'}</td>`;
                html += '</tr>';
            });
            html += '</tbody></table></div></div>';
        }

        html += '</div>';
        $('#modalBody').innerHTML = html;
        $('#detailModal').classList.add('active');
    }

    function detailField(label, value, wide, extraClass) {
        return `<div class="jewd-detail-field${wide ? ' wide' : ''}">
            <div class="jewd-detail-label">${esc(label)}</div>
            <div class="jewd-detail-value${extraClass ? ' ' + extraClass : ''}">${esc(String(value != null ? value : ''))}</div>
        </div>`;
    }

    function closeModal() {
        $('#detailModal').classList.remove('active');
    }

    /* ===== IMAGE MODAL ===== */
    function showImage(src) {
        $('#imgModalSrc').src = src;
        $('#imgModal').classList.add('active');
    }

    /* ===== EXPORT ===== */
    function exportJSON() {
        toast('Exportando JSON...');
        const data = state.products.map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            type: p.type,
            status: p.status,
            price: p.price,
            regular_price: p.regular_price,
            sale_price: p.sale_price,
            stock_status: p.stock_status,
            stock_quantity: p.stock_quantity,
            weight: p.weight,
            categories: (p.categories || []).map(c => c.name),
            variations: (state.variations[p.id] || []).map(v => ({
                id: v.id, sku: v.sku, price: v.price, stock_quantity: v.stock_quantity
            })),
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        download(blob, `jewelry-catalog-${dateStr()}.json`);
        toast(`JSON exportado: ${data.length} productos`);
    }

    function exportCSV() {
        toast('Exportando CSV...');
        const rows = [];
        rows.push(['ID', 'SKU', 'Nombre', 'Tipo', 'Estado', 'Precio', 'Precio Regular', 'Precio Oferta', 'Stock', 'Peso', 'Categorías'].join(','));

        state.products.forEach(p => {
            rows.push([
                p.id, csvEsc(p.sku), csvEsc(p.name), p.type, p.status,
                p.price, p.regular_price, p.sale_price || '',
                p.stock_quantity ?? '', p.weight || '',
                csvEsc((p.categories || []).map(c => c.name).join('; '))
            ].join(','));

            // Include variations.
            (state.variations[p.id] || []).forEach(v => {
                const vAttr = v.attributes ? v.attributes.map(a => `${a.name}:${a.option}`).join('; ') : '';
                rows.push([
                    v.id, csvEsc(v.sku), csvEsc('  ↳ ' + vAttr), 'variation', '',
                    v.price, v.regular_price, v.sale_price || '',
                    v.stock_quantity ?? '', v.weight || '', ''
                ].join(','));
            });
        });

        const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        download(blob, `jewelry-catalog-${dateStr()}.csv`);
        toast(`CSV exportado: ${rows.length - 1} registros`);
    }

    function download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /* ===== TOAST ===== */
    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    /* ===== HELPERS ===== */
    function esc(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(String(s)));
        return div.innerHTML;
    }

    function fmtN(n) {
        const v = parseFloat(n);
        if (isNaN(v)) return '0';
        return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function csvEsc(s) {
        if (!s) return '';
        s = String(s);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function dateStr() {
        return new Date().toISOString().split('T')[0];
    }

})();
