// script.js - Using JSONP approach
// Make sure this URL matches your actual deployed Apps Script URL
const scriptUrl = 'https://script.google.com/macros/s/AKfycby_YlnIx39W54SygtTAx1K-eM1Wf4jSDBOHQej6tyV57fnl2vOnLPNtTkgrfRRA1lSJuw/exec';

// Stable direct-download URL for CSV (used for right-click copy)
// This is the Google Sheets published CSV URL - works reliably in any automation tool
const csvExportUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0xg3Yy-RTLmgOM4pLYpTz_2Z27312GhQttLF1Tjo1rDBPq65tS2J_GbDPnBDQpNdtTl-7O4ZqDvv5/pub?gid=1729295615&single=true&output=csv';

let productData = [];
let dataLastUpdated = '';

function loadProductData() {
    console.log("Loading data using JSONP technique");
    console.log("Script URL:", scriptUrl);
    
    const productsTable = document.getElementById('products-table');
    if (productsTable) {
        productsTable.innerHTML = '<div class="loading">Loading product data...</div>';
    }
    
    const callbackName = 'handleData_' + Date.now();
    
    window[callbackName] = function(response) {
        console.log('JSONP Response received:', response);
        handleData(response);
        delete window[callbackName];
    };
    
    const script = document.createElement('script');
    const url = scriptUrl + '?callback=' + callbackName + '&nocache=' + new Date().getTime();
    console.log("Full request URL:", url);
    script.src = url;
    
    script.onerror = function() {
        showError('Failed to load data from server. Please check your connection and try again.');
        console.error('Script loading failed for URL:', url);
        delete window[callbackName];
    };
    
    script.onload = function() {
        console.log('Script loaded successfully');
        setTimeout(() => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }, 2000);
    };
    
    document.head.appendChild(script);
    
    setTimeout(() => {
        if (window[callbackName]) {
            console.error('JSONP timeout - callback never fired');
            showError('Request timeout. Please try refreshing the page.');
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }
    }, 15000);
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

// Copy a URL to clipboard and briefly flash the button label
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
        // Fallback for browsers that block clipboard without HTTPS
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
        // No right-click URL for XLSX - no reliable direct download URL available
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

document.addEventListener('DOMContentLoaded', function() {
    loadProductData();
    initializeSearch();
    initializeRefresh();
    initializeExport();
});
