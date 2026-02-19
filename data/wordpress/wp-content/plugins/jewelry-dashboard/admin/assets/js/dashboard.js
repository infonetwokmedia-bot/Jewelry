/**
 * Jewelry Dashboard — Frontend JavaScript
 * Connects to WooCommerce via AJAX and renders the catalog dashboard.
 *
 * @package Jewelry_Dashboard
 */

(function($) {
    'use strict';

    /* ===== STATE ===== */
    var state = {
        products:   [],
        stats:      null,
        opened:     {},
        page:       1,
        perPage:    50,
        totalPages: 1,
        total:      0,
        loading:    false,
        allExpanded: false
    };

    /* ===== INIT ===== */
    $(document).ready(function() {
        initTheme();
        bindEvents();
        loadStats();
        loadProducts();
    });

    /* ===== THEME ===== */
    function initTheme() {
        var saved = localStorage.getItem('jewd_theme');
        if (saved === 'light') {
            $('#jewd-app').addClass('jewd-light');
        }
        updateThemeIcon();
    }

    function toggleTheme() {
        $('#jewd-app').toggleClass('jewd-light');
        var isLight = $('#jewd-app').hasClass('jewd-light');
        localStorage.setItem('jewd_theme', isLight ? 'light' : 'dark');
        updateThemeIcon();
    }

    function updateThemeIcon() {
        var isLight = $('#jewd-app').hasClass('jewd-light');
        $('#btnTheme .dashicons')
            .removeClass('dashicons-welcome-view-site dashicons-visibility')
            .addClass(isLight ? 'dashicons-visibility' : 'dashicons-welcome-view-site');
    }

    /* ===== EVENTS ===== */
    function bindEvents() {
        $('#btnTheme').on('click', toggleTheme);
        $('#btnRefresh').on('click', function() {
            loadStats();
            loadProducts();
            toast('Datos actualizados');
        });
        $('#btnExpandAll').on('click', toggleExpandAll);
        $('#btnExportJSON').on('click', exportJSON);
        $('#btnExportCSV').on('click', exportCSV);

        // Filters.
        var debounceTimer;
        $('#filterSearch').on('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                state.page = 1;
                loadProducts();
            }, 400);
        });

        $('#filterCategory, #filterType, #filterStock').on('change', function() {
            state.page = 1;
            loadProducts();
        });

        // Modal close.
        $('#modalClose, #modalCloseBtn').on('click', closeModal);
        $('#detailModal').on('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Image modal.
        $('#imgModal').on('click', function() {
            $(this).removeClass('active');
        });

        // Keyboard.
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
                $('#imgModal').removeClass('active');
            }
        });
    }

    /* ===== LOAD STATS ===== */
    function loadStats() {
        $.post(jewdData.ajaxUrl, {
            action: 'jewd_get_stats',
            nonce:  jewdData.nonce
        }, function(res) {
            if (!res.success) return;
            state.stats = res.data;
            renderStats(res.data);
            populateCategoryFilter(res.data.categories);
        });
    }

    function renderStats(s) {
        var html = '';
        html += statCard('Productos', s.total_products, s.total_variable + ' variable &middot; ' + s.total_simple + ' simple');
        html += statCard('Variaciones', s.total_variations, 'en ' + s.total_variable + ' productos');
        html += statCard('Stock Total', s.total_stock, 'unidades', s.total_stock > 0 ? 'jewd-stat-success' : '');
        html += statCard('Categorías', Object.keys(s.categories).length, catNames(s.categories));
        html += statCard('Rango Precios', '$' + fmtN(s.min_price), 'hasta $' + fmtN(s.max_price));
        html += statCard('Valor Inventario', '$' + fmtN(s.total_value), 'al precio actual', 'jewd-stat-success');
        html += statCard('Stock Bajo', s.low_stock, 'items ≤ 2 unidades', s.low_stock > 0 ? 'jewd-stat-alert' : '');
        html += statCard('Sin Stock', s.out_of_stock, 'items agotados', s.out_of_stock > 0 ? 'jewd-stat-alert' : '');

        $('#statsContainer').html(html);
    }

    function statCard(label, value, sub, extraClass) {
        return '<div class="jewd-stat ' + (extraClass || '') + '">' +
            '<div class="jewd-stat-label">' + esc(label) + '</div>' +
            '<div class="jewd-stat-value">' + value + '</div>' +
            '<div class="jewd-stat-sub">' + (sub || '') + '</div>' +
            '</div>';
    }

    function catNames(cats) {
        return Object.keys(cats).map(function(k) { return cats[k].name; }).join(', ');
    }

    function populateCategoryFilter(cats) {
        var $sel = $('#filterCategory');
        var current = $sel.val();
        $sel.find('option:not(:first)').remove();
        Object.keys(cats).sort(function(a, b) {
            return cats[a].name.localeCompare(cats[b].name);
        }).forEach(function(slug) {
            $sel.append('<option value="' + esc(slug) + '">' + esc(cats[slug].name) + ' (' + cats[slug].count + ')</option>');
        });
        if (current) $sel.val(current);
    }

    /* ===== LOAD PRODUCTS ===== */
    function loadProducts() {
        if (state.loading) return;
        state.loading = true;

        var $tb = $('#productsTable');
        $tb.html('<tr><td colspan="11" class="jewd-loading-row"><span class="spinner is-active"></span> Cargando...</td></tr>');

        $.post(jewdData.ajaxUrl, {
            action:   'jewd_get_products',
            nonce:    jewdData.nonce,
            search:   $('#filterSearch').val(),
            category: $('#filterCategory').val(),
            type:     $('#filterType').val(),
            stock:    $('#filterStock').val(),
            page:     state.page,
            per_page: state.perPage
        }, function(res) {
            state.loading = false;
            if (!res.success) {
                $tb.html('<tr><td colspan="11" class="jewd-loading-row">Error cargando datos</td></tr>');
                return;
            }
            state.products   = res.data.products;
            state.total      = res.data.total;
            state.totalPages = res.data.total_pages;

            renderProducts();
            renderPagination();
            updateFilterCount();
        }).fail(function() {
            state.loading = false;
            $tb.html('<tr><td colspan="11" class="jewd-loading-row">Error de conexión</td></tr>');
        });
    }

    /* ===== RENDER PRODUCTS ===== */
    function renderProducts() {
        var products = state.products;
        var html = '';

        if (!products.length) {
            html = '<tr><td colspan="11" class="jewd-empty">' +
                '<span class="dashicons dashicons-search"></span><br>' +
                'No se encontraron productos</td></tr>';
            $('#productsTable').html(html);
            return;
        }

        products.forEach(function(p, idx) {
            var vs        = p.variations || [];
            var hasV      = vs.length > 0;
            var isOpen    = state.opened[p.id];
            var isVar     = p.type === 'variable';

            // Stock total for variable products.
            var vStock = 0;
            if (hasV) {
                vs.forEach(function(v) { vStock += (v.stock_qty || 0); });
            }

            // Attributes summary.
            var attrs = '';
            if (p.attributes) {
                var keys = Object.keys(p.attributes);
                if (keys.length) {
                    attrs = keys.map(function(k) {
                        var val = p.attributes[k];
                        return k + ': ' + (Array.isArray(val) ? val.join(', ') : val);
                    }).join(' | ');
                }
            }

            // Image.
            var imgHtml = p.image
                ? '<img class="jewd-thumb" src="' + esc(p.image) + '" onerror="this.outerHTML=\'<span class=jewd-nopic>N/A</span>\'" data-full="' + esc(p.image) + '">'
                : '<span class="jewd-nopic">N/A</span>';

            // Price.
            var priceHtml = '';
            if (isVar && p.price_min !== undefined) {
                priceHtml = '$' + fmtN(p.price_min) + ' &ndash; $' + fmtN(p.price_max);
            } else {
                if (p.sale_price && p.sale_price !== p.regular_price) {
                    priceHtml = '<span class="jewd-price-sale">$' + fmtN(p.regular_price) + '</span>' +
                        '<span class="jewd-price-current">$' + fmtN(p.sale_price) + '</span>';
                } else {
                    priceHtml = '<span class="jewd-price-current">$' + fmtN(p.price) + '</span>';
                }
            }

            // Offer column.
            var saleHtml = '&mdash;';
            if (!isVar && p.sale_price && p.sale_price !== p.regular_price) {
                saleHtml = '<span class="jewd-price-current">$' + fmtN(p.sale_price) + '</span>';
            }

            // Categories.
            var catStr = (p.categories || []).join(', ');

            // Stock display.
            var stockHtml = '';
            if (hasV) {
                var stockClass = vStock > 0 ? (vStock <= 5 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                stockHtml = '<span class="' + stockClass + '">' + vStock + '</span>';
            } else if (p.stock_qty !== null && p.stock_qty !== undefined) {
                var sc = p.stock_qty > 0 ? (p.stock_qty <= 2 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                stockHtml = '<span class="' + sc + '">' + p.stock_qty + '</span>';
            } else {
                stockHtml = '<span class="jewd-stock-in">' + esc(p.stock_status) + '</span>';
            }

            // Status badge.
            var statusBadge = p.status !== 'publish'
                ? ' <span class="jewd-badge jewd-badge-draft">' + esc(p.status) + '</span>'
                : '';

            // Build row.
            html += '<tr class="jewd-prow">';
            html += '<td>' + (hasV ? '<button class="jewd-expand-btn' + (isOpen ? ' open' : '') + '" data-id="' + p.id + '" title="' + vs.length + ' variaciones">&#9654;</button>' : '') + '</td>';
            html += '<td>' + imgHtml + '</td>';
            html += '<td class="jewd-sku">' + esc(p.sku || '') + '</td>';
            html += '<td><strong>' + esc(p.name) + '</strong>' + statusBadge;
            if (attrs) html += '<br><span style="font-size:.7rem;color:var(--jewd-text2)">' + esc(attrs) + '</span>';
            html += '</td>';
            html += '<td><span class="jewd-badge jewd-badge-' + (isVar ? 'var' : 'sim') + '">' + esc(p.type) + '</span>';
            if (hasV) html += '<span style="font-size:.7rem;color:var(--jewd-text2);margin-left:4px">(' + vs.length + ')</span>';
            html += '</td>';
            html += '<td>' + esc(catStr) + '</td>';
            html += '<td class="jewd-right">' + priceHtml + '</td>';
            html += '<td class="jewd-right">' + saleHtml + '</td>';
            html += '<td class="jewd-right">' + stockHtml + '</td>';
            html += '<td class="jewd-right">' + esc(p.weight || '—') + '</td>';
            html += '<td class="jewd-center">';
            html += '<button class="jewd-action-btn" data-action="detail" data-idx="' + idx + '" title="Ver detalle"><span class="dashicons dashicons-visibility"></span></button>';
            html += '<a class="jewd-action-btn" href="' + esc(p.edit_url || '#') + '" title="Editar en WooCommerce" target="_blank"><span class="dashicons dashicons-edit"></span></a>';
            html += '<a class="jewd-action-btn" href="' + esc(p.view_url || '#') + '" title="Ver en tienda" target="_blank"><span class="dashicons dashicons-admin-links"></span></a>';
            html += '</td>';
            html += '</tr>';

            // Variation rows.
            if (hasV && isOpen) {
                vs.forEach(function(v) {
                    var vAttr = '';
                    if (v.attributes) {
                        vAttr = Object.keys(v.attributes).map(function(k) {
                            return k + ': ' + v.attributes[k];
                        }).join(', ');
                    }

                    var vPriceHtml = '';
                    if (v.sale_price && v.sale_price !== v.regular_price) {
                        vPriceHtml = '<span class="jewd-price-sale">$' + fmtN(v.regular_price) + '</span>' +
                            '<span class="jewd-price-current">$' + fmtN(v.sale_price) + '</span>';
                    } else {
                        vPriceHtml = '<span class="jewd-price-current">$' + fmtN(v.price) + '</span>';
                    }

                    var vSaleHtml = (v.sale_price && v.sale_price !== v.regular_price)
                        ? '<span class="jewd-price-current">$' + fmtN(v.sale_price) + '</span>'
                        : '&mdash;';

                    var vStockHtml = '';
                    if (v.stock_qty !== null && v.stock_qty !== undefined) {
                        var vsc = v.stock_qty > 0 ? (v.stock_qty <= 2 ? 'jewd-stock-low' : 'jewd-stock-in') : 'jewd-stock-out';
                        vStockHtml = '<span class="' + vsc + '">' + v.stock_qty + '</span>';
                    } else {
                        vStockHtml = '&mdash;';
                    }

                    html += '<tr class="jewd-vrow">';
                    html += '<td></td>';
                    html += '<td></td>';
                    html += '<td class="jewd-sku jewd-var-indent">&#8627; ' + esc(v.sku || '') + '</td>';
                    html += '<td><span class="jewd-var-attr">' + esc(vAttr) + '</span></td>';
                    html += '<td><span class="jewd-badge jewd-badge-v">var</span></td>';
                    html += '<td></td>';
                    html += '<td class="jewd-right">' + vPriceHtml + '</td>';
                    html += '<td class="jewd-right">' + vSaleHtml + '</td>';
                    html += '<td class="jewd-right">' + vStockHtml + '</td>';
                    html += '<td class="jewd-right">' + esc(v.weight || '—') + '</td>';
                    html += '<td></td>';
                    html += '</tr>';
                });
            }
        });

        var $tb = $('#productsTable');
        $tb.html(html);

        // Bind expand buttons.
        $tb.find('.jewd-expand-btn').on('click', function() {
            var id = $(this).data('id');
            if (state.opened[id]) {
                delete state.opened[id];
            } else {
                state.opened[id] = true;
            }
            renderProducts();
        });

        // Bind thumbnail clicks.
        $tb.find('.jewd-thumb').on('click', function() {
            var src = $(this).data('full') || $(this).attr('src');
            showImage(src);
        });

        // Bind detail buttons.
        $tb.find('[data-action="detail"]').on('click', function() {
            var idx = $(this).data('idx');
            showDetail(state.products[idx]);
        });
    }

    /* ===== PAGINATION ===== */
    function renderPagination() {
        var $pg = $('#pagination');
        if (state.totalPages <= 1) {
            $pg.html('<span>Mostrando ' + state.products.length + ' de ' + state.total + ' productos</span>');
            return;
        }

        var html = '<span>Página ' + state.page + ' de ' + state.totalPages + ' (' + state.total + ' productos)</span> ';
        html += '<button ' + (state.page <= 1 ? 'disabled' : '') + ' data-page="' + (state.page - 1) + '">&laquo; Anterior</button>';

        // Page numbers.
        var start = Math.max(1, state.page - 2);
        var end   = Math.min(state.totalPages, state.page + 2);
        for (var i = start; i <= end; i++) {
            html += '<button data-page="' + i + '"' + (i === state.page ? ' class="active"' : '') + '>' + i + '</button>';
        }

        html += '<button ' + (state.page >= state.totalPages ? 'disabled' : '') + ' data-page="' + (state.page + 1) + '">Siguiente &raquo;</button>';

        $pg.html(html);
        $pg.find('button').on('click', function() {
            var p = $(this).data('page');
            if (p && p !== state.page) {
                state.page = p;
                loadProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function updateFilterCount() {
        var total = state.stats ? state.stats.total_products : '?';
        $('#filterCount').text(state.total + ' de ' + total);
    }

    /* ===== EXPAND ALL ===== */
    function toggleExpandAll() {
        if (state.allExpanded) {
            state.opened = {};
            state.allExpanded = false;
            $('#btnExpandAll').html('<span class="dashicons dashicons-editor-expand"></span> Expandir Todo');
        } else {
            state.products.forEach(function(p) {
                if (p.variations && p.variations.length > 0) {
                    state.opened[p.id] = true;
                }
            });
            state.allExpanded = true;
            $('#btnExpandAll').html('<span class="dashicons dashicons-editor-contract"></span> Colapsar Todo');
        }
        renderProducts();
    }

    /* ===== DETAIL MODAL ===== */
    function showDetail(p) {
        if (!p) return;
        $('#modalTitle').text(p.name);
        $('#modalEditLink').attr('href', p.edit_url || '#');
        $('#modalViewLink').attr('href', p.view_url || '#');

        var html = '<div class="jewd-detail-grid">';
        html += detailField('ID', p.id);
        html += detailField('Tipo', p.type);
        html += detailField('SKU', p.sku || '—', true, 'sku');
        html += detailField('Estado', p.status);
        html += detailField('Categorías', (p.categories || []).join(', ') || '—');
        html += detailField('Tags', (p.tags || []).join(', ') || '—');

        if (p.type === 'variable') {
            html += detailField('Precio Rango', '$' + fmtN(p.price_min) + ' — $' + fmtN(p.price_max));
            html += detailField('Variaciones', (p.variations || []).length);
        } else {
            html += detailField('Precio Regular', '$' + fmtN(p.regular_price));
            html += detailField('Precio Oferta', p.sale_price ? '$' + fmtN(p.sale_price) : '—');
            html += detailField('Stock', p.stock_qty !== null ? p.stock_qty : p.stock_status);
            html += detailField('Peso', p.weight || '—');
        }

        html += detailField('Fecha Creación', p.date_created || '—');

        // Image.
        if (p.image) {
            html += '<div class="jewd-detail-field wide"><div class="jewd-detail-label">Imagen</div>' +
                '<div><img src="' + esc(p.image) + '" style="max-width:200px;border-radius:8px;cursor:pointer;border:1px solid var(--jewd-border)" onclick="document.getElementById(\'imgModalSrc\').src=this.src;document.getElementById(\'imgModal\').classList.add(\'active\')"></div></div>';
        }

        // Attributes.
        if (p.attributes) {
            var attrKeys = Object.keys(p.attributes);
            if (attrKeys.length) {
                var attrStr = attrKeys.map(function(k) {
                    var v = p.attributes[k];
                    return '<strong>' + esc(k) + ':</strong> ' + (Array.isArray(v) ? v.join(', ') : v);
                }).join('<br>');
                html += '<div class="jewd-detail-field wide"><div class="jewd-detail-label">Atributos</div>' +
                    '<div class="jewd-detail-value">' + attrStr + '</div></div>';
            }
        }

        // Short description.
        if (p.short_desc) {
            html += detailField('Descripción Corta', p.short_desc, true);
        }

        // Variations table.
        if (p.variations && p.variations.length) {
            html += '<div class="jewd-detail-field wide"><div class="jewd-detail-label">Variaciones (' + p.variations.length + ')</div>';
            html += '<div style="overflow-x:auto;margin-top:6px"><table class="jewd-table" style="font-size:.78rem">';
            html += '<thead><tr><th>SKU</th><th>Atributos</th><th class="jewd-right">Precio</th><th class="jewd-right">Oferta</th><th class="jewd-right">Stock</th><th class="jewd-right">Peso</th></tr></thead><tbody>';

            p.variations.forEach(function(v) {
                var va = v.attributes ? Object.keys(v.attributes).map(function(k) { return k + ': ' + v.attributes[k]; }).join(', ') : '';
                html += '<tr>';
                html += '<td class="jewd-sku">' + esc(v.sku || '') + '</td>';
                html += '<td class="jewd-var-attr">' + esc(va) + '</td>';
                html += '<td class="jewd-right">' + (v.regular_price ? '$' + fmtN(v.regular_price) : '$' + fmtN(v.price)) + '</td>';
                html += '<td class="jewd-right">' + (v.sale_price ? '$' + fmtN(v.sale_price) : '—') + '</td>';
                html += '<td class="jewd-right">' + (v.stock_qty !== null ? v.stock_qty : '—') + '</td>';
                html += '<td class="jewd-right">' + (v.weight || '—') + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div></div>';
        }

        html += '</div>';
        $('#modalBody').html(html);
        $('#detailModal').addClass('active');
    }

    function detailField(label, value, wide, extraClass) {
        return '<div class="jewd-detail-field' + (wide ? ' wide' : '') + '">' +
            '<div class="jewd-detail-label">' + esc(label) + '</div>' +
            '<div class="jewd-detail-value' + (extraClass ? ' ' + extraClass : '') + '">' + esc(String(value != null ? value : '')) + '</div></div>';
    }

    function closeModal() {
        $('#detailModal').removeClass('active');
    }

    /* ===== IMAGE MODAL ===== */
    function showImage(src) {
        $('#imgModalSrc').attr('src', src);
        $('#imgModal').addClass('active');
    }

    /* ===== EXPORT ===== */
    function exportJSON() {
        toast('Exportando JSON...');
        $.post(jewdData.ajaxUrl, {
            action: 'jewd_export_json',
            nonce:  jewdData.nonce
        }, function(res) {
            if (!res.success) { toast('Error exportando'); return; }
            var blob = new Blob([JSON.stringify(res.data.json, null, 2)], { type: 'application/json' });
            download(blob, res.data.filename);
            toast('JSON exportado: ' + res.data.count + ' productos');
        });
    }

    function exportCSV() {
        toast('Exportando CSV...');
        $.post(jewdData.ajaxUrl, {
            action: 'jewd_export_csv',
            nonce:  jewdData.nonce
        }, function(res) {
            if (!res.success) { toast('Error exportando'); return; }
            var blob = new Blob(['\uFEFF' + res.data.csv], { type: 'text/csv;charset=utf-8' });
            download(blob, res.data.filename);
            toast('CSV exportado: ' + res.data.count + ' registros');
        });
    }

    function download(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /* ===== TOAST ===== */
    function toast(msg) {
        var $t = $('#toast');
        $t.text(msg).addClass('show');
        setTimeout(function() { $t.removeClass('show'); }, 3000);
    }

    /* ===== HELPERS ===== */
    function esc(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(s)));
        return div.innerHTML;
    }

    function fmtN(n) {
        var v = parseFloat(n);
        if (isNaN(v)) return '0';
        return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

})(jQuery);
