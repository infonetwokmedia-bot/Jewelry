<?php
/**
 * Dashboard page template.
 *
 * @package Jewelry_Dashboard
 */

defined( 'ABSPATH' ) || exit;
?>
<div id="jewd-app" class="jewd-wrap">

    <!-- TOPBAR -->
    <div class="jewd-topbar">
        <h1 class="jewd-title">
            <span class="dashicons dashicons-diamond"></span>
            Jewelry Dashboard
            <span class="jewd-version">v<?php echo esc_html( JEWD_VERSION ); ?></span>
        </h1>
        <div class="jewd-actions">
            <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="btnExpandAll" title="Expandir/Colapsar todo">
                <span class="dashicons dashicons-editor-expand"></span> Expandir Todo
            </button>
            <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="btnExportJSON" title="Exportar JSON">
                <span class="dashicons dashicons-download"></span> JSON
            </button>
            <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="btnExportCSV" title="Exportar CSV">
                <span class="dashicons dashicons-media-spreadsheet"></span> CSV
            </button>
            <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="btnRefresh" title="Refrescar datos">
                <span class="dashicons dashicons-update"></span> Refrescar
            </button>
            <button class="jewd-btn-theme" id="btnTheme" title="Cambiar tema">
                <span class="dashicons dashicons-welcome-view-site"></span>
            </button>
        </div>
    </div>

    <!-- STATS -->
    <div class="jewd-stats" id="statsContainer">
        <div class="jewd-stat jewd-loading-pulse">
            <div class="jewd-stat-label">Cargando...</div>
            <div class="jewd-stat-value">—</div>
        </div>
    </div>

    <!-- FILTERS -->
    <div class="jewd-filters">
        <input type="text" id="filterSearch" class="jewd-input" placeholder="Buscar nombre, SKU, categoría...">
        <select id="filterCategory" class="jewd-select">
            <option value="">Todas categorías</option>
        </select>
        <select id="filterType" class="jewd-select">
            <option value="">Todos tipos</option>
            <option value="variable">Variable</option>
            <option value="simple">Simple</option>
        </select>
        <select id="filterStock" class="jewd-select">
            <option value="">Todo stock</option>
            <option value="instock">En stock</option>
            <option value="outofstock">Sin stock</option>
        </select>
        <span class="jewd-filter-count" id="filterCount"></span>
    </div>

    <!-- TABLE -->
    <div class="jewd-table-wrap">
        <table class="jewd-table">
            <thead>
                <tr>
                    <th style="width:30px"></th>
                    <th style="width:44px">Img</th>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th class="jewd-right">Precio</th>
                    <th class="jewd-right">Oferta</th>
                    <th class="jewd-right">Stock</th>
                    <th class="jewd-right">Peso</th>
                    <th style="width:100px" class="jewd-center">Acciones</th>
                </tr>
            </thead>
            <tbody id="productsTable">
                <tr>
                    <td colspan="11" class="jewd-loading-row">
                        <span class="spinner is-active"></span>
                        Cargando catálogo desde WooCommerce...
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- PAGINATION -->
    <div class="jewd-pagination" id="pagination"></div>

    <!-- DETAIL MODAL -->
    <div class="jewd-modal" id="detailModal">
        <div class="jewd-modal-dialog">
            <div class="jewd-modal-header">
                <h2 id="modalTitle">Detalle del Producto</h2>
                <button class="jewd-modal-close" id="modalClose">&times;</button>
            </div>
            <div class="jewd-modal-body" id="modalBody"></div>
            <div class="jewd-modal-footer">
                <a href="#" class="jewd-btn jewd-btn-outline" id="modalEditLink" target="_blank">
                    <span class="dashicons dashicons-edit"></span> Editar en WooCommerce
                </a>
                <a href="#" class="jewd-btn jewd-btn-outline" id="modalViewLink" target="_blank">
                    <span class="dashicons dashicons-visibility"></span> Ver en Tienda
                </a>
                <button class="jewd-btn jewd-btn-gold" id="modalCloseBtn">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- IMAGE PREVIEW MODAL -->
    <div class="jewd-img-modal" id="imgModal">
        <img id="imgModalSrc" src="" alt="Preview">
    </div>

    <!-- TOAST -->
    <div class="jewd-toast" id="toast"></div>
</div>
