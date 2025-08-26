// script.js - Using JSONP approach
// Make sure this URL matches your actual deployed Apps Script URL
const scriptUrl = 'https://script.google.com/macros/s/AKfycby_YlnIx39W54SygtTAx1K-eM1Wf4jSDBOHQej6tyV57fnl2vOnLPNtTkgrfRRA1lSJuw/exec';
let productData = [];
let dataLastUpdated = '';

function loadProductData() {
    console.log("Loading data from: ", scriptUrl);
    
    // Show loading state
    const productsTable = document.getElementById('products-table');
    if (productsTable) {
        productsTable.innerHTML = '<div class="loading">Loading product data...</div>';
    }
    
    // Create a script element for JSONP
    const script = document.createElement('script');
    script.src = scriptUrl + '?callback=handleData&random=' + new Date().getTime();
    
    // Add error handling for script loading
    script.onerror = function() {
        showError('Failed to load data from server. Please check your connection and try again.');
        console.error('Script loading failed');
    };
    
    // Clean up script after use
    script.onload = function() {
        setTimeout(() => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }, 1000);
    };
    
    document.head.appendChild(script);
}

// This function will be called by the JSONP response
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
    
    // Find and display last updated time if available
    if (productData[0] && productData[0]['Last Updated']) {
        dataLastUpdated = productData[0]['Last Updated'];
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${dataLastUpdated}`;
        }
    }
    
    // Update footer timestamp
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
    
    // Create table structure
    const table = document.createElement('table');
    table.id = 'product-table';
    table.className = 'product-table';
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Get headers from first item
    const headers = Object.keys(productData[0]).filter(header => header !== 'Last Updated');
    
    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create data rows
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
    
    // Show error in the products table area
    const productsTable = document.getElementById('products-table');
    if (productsTable) {
        productsTable.innerHTML = `<div class="error-message">${message}</div>`;
    }
    
    // Also show in dedicated error element if it exists
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

// Search functionality
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

// Refresh functionality
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

// Export functionality
function initializeExport() {
    const exportBtn = document.getElementById('export-btn');
    const exportOptions = document.getElementById('export-options');
    
    if (exportBtn && exportOptions) {
        exportBtn.addEventListener('click', () => {
            exportOptions.style.display = exportOptions.style.display === 'block' ? 'none' : 'block';
        });
        
        // Handle export option clicks
        exportOptions.addEventListener('click', (e) => {
            const format = e.target.getAttribute('data-format');
            if (format && productData.length > 0) {
                exportData(format);
                exportOptions.style.display = 'none';
            }
        });
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

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadProductData();
    initializeSearch();
    initializeRefresh();
    initializeExport();
    
    // Close export dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const exportOptions = document.getElementById('export-options');
        const exportBtn = document.getElementById('export-btn');
        if (exportOptions && !exportBtn.contains(e.target)) {
            exportOptions.style.display = 'none';
        }
    });
});
