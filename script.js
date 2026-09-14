// script.js - Using JSONP approach
// Make sure this URL matches your actual deployed Apps Script URL
const scriptUrl = 'https://script.google.com/macros/s/AKfycbyqC36jp10XXbjs7flVxa3TTcFv6rHu3XebRBo6qVlks2l3C3vR0MLHwQ_SfzKbm9XgqA/exec';

// Stable direct-download URL for CSV (used for right-click copy)
const csvExportUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0xg3Yy-RTLmgOM4pLYpTz_2Z27312GhQttLF1Tjo1rDBPq65tS2J_GbDPnBDQpNdtTl-7O4ZqDvv5/pub?gid=1729295615&single=true&output=csv';

let productData = [];
let dataLastUpdated = '';

// The live feed is a Google Apps Script. When Google is slow to run it, a request
// can take 20-45 seconds or fail with a "file cannot be opened" page, and the old
// 15-second limit turned that into an error for the visitor. The same sheet is
// also published as CSV by Google Sheets itself, which does not run the script,
// answers in about a second, and carries identical rows -- only without the
// "Last Updated" column. So: ask the live feed, show the published copy if the
// feed has not answered within a few seconds, and swap in the live data if it
// arrives later. An error appears only when both sources fail.
const FALLBACK_AFTER_MS = 5000;
const LIVE_GIVE_UP_MS = 45000;

// Minimal CSV reader that keeps every value as text, so EAN codes are never
// turned into numbers.
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
            } else {
                field += c;
            }
        } else if (c === '"') {
            quoted = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n') {
            row.push(field); rows.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift() || [];
    return rows
        .filter(r => r.some(v => v !== ''))
        .map(r => {
            const obj = {};
            header.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ''; });
            return obj;
        });
}

function sameRows(a, b) {
    const strip = rows => JSON.stringify(rows.map(r => {
        const o = Object.assign({}, r);
        delete o['Last Updated'];
        return o;
    }));
    return a.length === b.length && strip(a) === strip(b);
}

function loadProductData() {
    const productsTable = document.getElementById('products-table');
    if (productsTable) {
        productsTable.innerHTML = '<div class="loading">Loading product data...</div>';
    }

    const state = { shown: false, live: false, fallbackStarted: false,
                    liveFailed: false, fallbackFailed: false };

    function failIfNothingWorked() {
        if (!state.shown && state.liveFailed && state.fallbackFailed) {
            showError('The stock list could not be loaded just now. Please refresh the page in a minute.');
        }
    }

    function showPublishedCopy() {
        if (state.fallbackStarted || state.live) return;
        state.fallbackStarted = true;
        fetch(csvExportUrl + '&nocache=' + Date.now())
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(text => {
                const rows = parseCsv(text);
                if (!rows.length) throw new Error('published copy is empty');
                if (state.live) return;              // the live feed answered first
                processData(rows);
                clearError();
                state.shown = true;
            })
            .catch(err => {
                console.error('Published CSV failed:', err);
                state.fallbackFailed = true;
                failIfNothingWorked();
            });
    }

    const callbackName = 'handleData_' + Date.now();
    // Never deleted: a late answer must find its callback rather than throw.
    window[callbackName] = function (response) {
        if (!(response && response.success && response.data && response.data.length)) {
            console.error('Live feed returned no data:', response);
            state.liveFailed = true;
            showPublishedCopy();
            failIfNothingWorked();
            return;
        }
        const late = state.shown && !state.live;
        state.live = true;
        if (late && sameRows(response.data, productData)) {
            // Nothing changed since the published copy was shown. Keep the table,
            // and anything the visitor has typed into search, and just add the
            // timestamp the published copy does not carry.
            productData = response.data;
            const stamp = response.data[0]['Last Updated'];
            const el = document.getElementById('last-updated');
            if (el && stamp) el.textContent = 'Last updated: ' + stamp;
        } else {
            processData(response.data);
            clearError();
            // Rebuilding the table shows every row again; re-apply any search.
            if (late && typeof performSearch === 'function') performSearch();
        }
        state.shown = true;
    };

    const script = document.createElement('script');
    script.src = scriptUrl + '?callback=' + callbackName + '&nocache=' + Date.now();
    script.onerror = function () {
        console.error('Live feed request failed');
        state.liveFailed = true;
        showPublishedCopy();
        failIfNothingWorked();
    };
    script.onload = function () {
        setTimeout(() => { if (script.parentNode) script.parentNode.removeChild(script); }, 2000);
    };
    document.head.appendChild(script);

    setTimeout(showPublishedCopy, FALLBACK_AFTER_MS);
    setTimeout(() => {
        if (!state.live && !state.liveFailed) {
            state.liveFailed = true;
            failIfNothingWorked();
        }
    }, LIVE_GIVE_UP_MS);
}

function handleData(response) {
    console.log('Received response:', response);
    
    if (response && response.success && response.data) {
        productData = response.data;
        processData(productData);
        clearError();
    } else {
        const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
        showError('Failed to load data: ' + errorMsg);
        console.error('Data loading error:', response);
    }
}

function processData(data) {
    if (!data || data.length === 0) {
        showError('No data available');
        return;
    }
    
    productData = data;
    
    if (productData[0] && productData[0]['Last Updated']) {
        dataLastUpdated = productData[0]['Last Updated'];
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${dataLastUpdated}`;
        }
    }
    
    const footerTime = document.getElementById('footer-time');
    if (footerTime) {
        footerTime.textContent = new Date().toLocaleString();
    }
    
    populateProductTable();
    updateProductCount();
}

function populateProductTable() {
    const productsTableContainer = document.getElementById('products-table');
    if (!productsTableContainer) return;
    
    if (productData.length === 0) {
        productsTableContainer.innerHTML = '<div class="no-data">No products found.</div>';
        return;
    }
    
    const table = document.createElement('table');
    table.id = 'product-table';
    table.className = 'product-table';
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    const headers = Object.keys(productData[0]).filter(header => header !== 'Last Updated');
    
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    productData.forEach(product => {
        const row = document.createElement('tr');
        headers.forEach(header => {
            const cell = document.createElement('td');
            cell.textContent = product[header] || '-';
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    productsTableContainer.innerHTML = '';
    productsTableContainer.appendChild(table);
}

function updateProductCount() {
    const countElement = document.getElementById('product-count');
    if (countElement && productData) {
        countElement.textContent = `Total products: ${productData.length}`;
    }
}

function showError(message) {
    console.error('Error:', message);
    const productsTable = document.getElementById('products-table');
    if (productsTable) {
        productsTable.innerHTML = `<div class="error-message">${message}</div>`;
    }
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            performSearch();
        });
    }
}

function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const table = document.getElementById('product-table');
    if (!table) return;
    const rows = table.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
    if (!rows) return;
    for (let row of rows) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    }
}

function initializeRefresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
            loadProductData();
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh Data';
            }, 2000);
        });
    }
}

function copyUrlToClipboard(btn, url) {
    navigator.clipboard.writeText(url).then(() => {
        const original = btn.textContent;
        btn.textContent = 'URL Copied!';
        btn.style.background = 'var(--primary-dark)';
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
        }, 2000);
    }).catch(() => {
        prompt('Copy this URL:', url);
    });
}

function initializeExport() {
    const csvBtn = document.getElementById('export-csv-btn');
    const xlsxBtn = document.getElementById('export-xlsx-btn');

    if (csvBtn) {
        csvBtn.addEventListener('click', () => exportData('csv'));
        csvBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            copyUrlToClipboard(csvBtn, csvExportUrl);
        });
    }

    if (xlsxBtn) {
        xlsxBtn.addEventListener('click', () => exportData('xlsx'));
    }
}

function exportData(format) {
    if (!productData || productData.length === 0) {
        alert('No data to export');
        return;
    }
    const filename = `VADIMPEX_Products_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
        exportToCSV(filename);
    } else if (format === 'xlsx') {
        exportToExcel(filename);
    }
}

function exportToCSV(filename) {
    const headers = Object.keys(productData[0]).filter(h => h !== 'Last Updated');
    const csvContent = [
        headers.join(','),
        ...productData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    downloadFile(csvContent, filename + '.csv', 'text/csv');
}

function exportToExcel(filename) {
    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(productData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, filename + '.xlsx');
    } else {
        alert('Excel export library not loaded');
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
//  API DOCUMENTATION SECTION
// ═══════════════════════════════════════════════════════════════════

function buildApiSection() {
    const container = document.getElementById('api-section');
    if (!container) return;

    // The base URL customers use — same Apps Script, just with ?key=...
    const apiBase = scriptUrl;

    container.innerHTML = `
        <div class="api-card">
            <div class="api-header" id="api-toggle-header">
                <h2>🔌 API Access</h2>
                <span class="api-toggle-hint">For developers & automated systems ▼</span>
            </div>

            <div class="api-body" id="api-body">

                <p class="api-intro">
                    Customers and partners with an <strong>API key</strong> can connect directly to the
                    VADIMPEX live stock — no manual download needed. Contact us to request your key.
                </p>

                <div class="api-formats">
                    <div class="api-format-card">
                        <div class="api-format-icon">📄</div>
                        <div class="api-format-name">JSON</div>
                        <div class="api-format-desc">Structured data for developers</div>
                        <code class="api-url-preview">${apiBase}?key=<em>YOUR_KEY</em>&amp;format=json</code>
                        <button class="btn-copy-url" onclick="copyUrlToClipboard(this, '${apiBase}?key=YOUR_KEY&format=json')">Copy URL</button>
                    </div>
                    <div class="api-format-card">
                        <div class="api-format-icon">📊</div>
                        <div class="api-format-name">CSV</div>
                        <div class="api-format-desc">For Excel, Python, any tool</div>
                        <code class="api-url-preview">${apiBase}?key=<em>YOUR_KEY</em>&amp;format=csv</code>
                        <button class="btn-copy-url" onclick="copyUrlToClipboard(this, '${apiBase}?key=YOUR_KEY&format=csv')">Copy URL</button>
                    </div>
                </div>

                <div class="api-howto">
                    <h3>How it works</h3>
                    <ol>
                        <li><strong>Contact us</strong> to receive your personal API key (e.g. <code>VAD-A3F9B2C1</code>)</li>
                        <li><strong>Replace <code>YOUR_KEY</code></strong> in the URL above with your key</li>
                        <li><strong>Call the URL</strong> from your system, script, or automation tool — data is always live</li>
                        <li>Choose <code>format=json</code> or <code>format=csv</code> depending on your needs</li>
                    </ol>
                </div>

                <div class="api-example">
                    <h3>Example — Python (3 lines)</h3>
                    <pre><code>import pandas as pd
df = pd.read_csv("${apiBase}?key=YOUR_KEY&format=csv")
print(df.head())</code></pre>
                </div>

                <div class="api-contact">
                    <p>
                        🔑 Need an API key? Contact
                        <a href="mailto:nikolay.badjorov@vadimpex.com">nikolay.badjorov@vadimpex.com</a>
                    </p>
                </div>

            </div><!-- /api-body -->
        </div><!-- /api-card -->
    `;

    // Collapsible toggle
    document.getElementById('api-toggle-header').addEventListener('click', () => {
        const body = document.getElementById('api-body');
        const hint = document.querySelector('.api-toggle-hint');
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        hint.textContent = isOpen
            ? 'For developers & automated systems ▶'
            : 'For developers & automated systems ▼';
    });
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    loadProductData();
    initializeSearch();
    initializeRefresh();
    initializeExport();
    buildApiSection();
});
