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
