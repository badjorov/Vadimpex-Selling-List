// Configuration
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0xg3Yy-RTLmgOM4pLYpTz_2Z27312GhQttLF1Tjo1rDBPq65tS2J_GbDPnBDQpNdtTl-7O4ZqDvv5/pub?gid=1729295615&single=true&output=csv';

// State management
let currentData = [];
let lastUpdateTime = null;

// Initialize
async function init() {
    try {
        showLoadingState();
        await loadData();
        updateTimestamp();
    } catch (err) {
        showErrorState(err);
    }
}

// Load data from Google Sheets
async function loadData() {
    try {
        // Add cache busting to URL
        const url = `${SPREADSHEET_URL}&t=${Date.now()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const csvData = await response.text();
        currentData = parseCSV(csvData);
        renderTable(currentData);
        
        // Update product count
        document.getElementById('product-count').textContent = 
            `Showing ${currentData.length} products`;
        
    } catch (err) {
        console.error("Data loading error:", err);
        throw err;
    }
}

// Robust CSV parser
function parseCSV(csv) {
    const rows = csv.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) return [];
    
    // Extract headers
    const headers = rows[0].split(',').map(h => h.trim());
    
    return rows.slice(1).map(row => {
        // Handle commas inside quoted fields
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const values = [];
        let match;
        
        while ((match = regex.exec(row)) !== null) {
            let value = match[0];
            if (value.startsWith(',')) value = value.substring(1);
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            value = value.replace(/""/g, '"').trim();
            values.push(value);
        }
        
        // Ensure we have same number of values as headers
        const result = {};
        headers.forEach((header, index) => {
            result[header] = values[index] || '';
        });
        
        return result;
    });
}

// Render data to table
function renderTable(data) {
    if (!data || data.length === 0) {
        document.getElementById('products-table').innerHTML = 
            '<p class="error">No products available</p>';
        return;
    }

    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(item => {
        const row = document.createElement('tr');
        Object.entries(item).forEach(([key, value]) => {
            const td = document.createElement('td');
            
            // Add special formatting for status columns
            if (key.toLowerCase().includes('status')) {
                td.className = getStatusClass(value);
            }
            
            td.textContent = value;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    
    document.getElementById('products-table').innerHTML = '';
    document.getElementById('products-table').appendChild(table);
}

// Get CSS class for status values
function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('available') || statusLower.includes('in stock')) {
        return 'status-available';
    }
    if (statusLower.includes('low') || statusLower.includes('limited')) {
        return 'status-low';
    }
    if (statusLower.includes('out') || statusLower.includes('sold')) {
        return 'status-out';
    }
    return '';
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        let visibleCount = 0;
        
        rows.forEach((row, index) => {
            if (index < currentData.length) {
                const rowData = Object.values(currentData[index]).join(' ').toLowerCase();
                const isVisible = rowData.includes(searchTerm);
                row.style.display = isVisible ? '' : 'none';
                if (isVisible) visibleCount++;
            }
        });
        
        document.getElementById('product-count').textContent = 
            `Showing ${visibleCount} of ${currentData.length} products`;
        
        // Track search
        try {
            gtag('event', 'search', { search_term: searchTerm });
        } catch (e) {
            console.log("Analytics blocked");
        }
    });
    
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = '';
        });
        document.getElementById('product-count').textContent = 
            `Showing ${currentData.length} products`;
    });
}

// Export functionality
function setupExport() {
    const exportBtn = document.getElementById('export-btn');
    const exportOptions = document.getElementById('export-options');
    
    // Toggle export options
    exportBtn.addEventListener('click', () => {
        exportOptions.style.display = exportOptions.style.display === 'block' ? 'none' : 'block';
    });
    
    // Handle export format selection
    exportOptions.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.target.dataset.format;
            exportOptions.style.display = 'none';
            
            switch(format) {
                case 'csv':
                    exportCSV();
                    break;
                case 'xlsx':
                    exportExcel();
                    break;
                case 'pdf':
                    exportPDF();
                    break;
            }
        });
    });
    
    // Close export options when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportOptions.contains(e.target)) {
            exportOptions.style.display = 'none';
        }
    });
}

function exportCSV() {
    if (!currentData.length) return;
    
    // Create CSV content
    const headers = Object.keys(currentData[0]);
    const csvRows = [
        headers.join(','),
        ...currentData.map(row => 
            headers.map(fieldName => {
                const value = row[fieldName];
                // Escape quotes and wrap in quotes if contains comma
                return /,/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vadimpex-products-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportExcel() {
    if (!currentData.length) return;
    
    try {
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(currentData);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        
        // Generate file and download
        XLSX.writeFile(wb, `vadimpex-products-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
        console.error('Excel export error:', e);
        alert('Error exporting to Excel. Please try again.');
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Add title
    doc.setFontSize(18);
    doc.text('VADIMPEX Product List', 40, 40);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);
    
    // Add table
    const table = document.querySelector('table');
    html2canvas(table).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 80;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        doc.addImage(imgData, 'PNG', 40, 80, pdfWidth, pdfHeight);
        doc.save(`vadimpex-products-${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

// UI States
function showLoadingState() {
    document.getElementById('products-table').innerHTML = 
        '<div class="loading">Loading product data...</div>';
}

function showErrorState(error) {
    document.getElementById('products-table').innerHTML = 
        `<p class="error">Error loading data: ${error.message || 'Please try again later'}</p>`;
}

function updateTimestamp() {
    const now = new Date();
    lastUpdateTime = now;
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    
    document.getElementById('last-updated').textContent = 
        `Last updated: ${dateString} ${timeString}`;
    document.getElementById('footer-time').textContent = 
        `${dateString} ${timeString}`;
}

// Event listeners
function setupEventListeners() {
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        try {
            showLoadingState();
            await loadData();
            updateTimestamp();
        } catch (err) {
            showErrorState(err);
        }
    });
    
    // Auto-refresh every 5 minutes
    setInterval(async () => {
        try {
            await loadData();
            updateTimestamp();
        } catch (err) {
            console.log("Auto-refresh error:", err);
        }
    }, 300000); // 5 minutes
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    init();
    setupSearch();
    setupExport();
    setupEventListeners();
    
    // Track page view
    try {
        gtag('event', 'page_view', {
            page_title: document.title,
            page_location: location.href
        });
    } catch (e) {
        console.log("Analytics blocked");
    }
});
