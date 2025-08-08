// Configuration
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0xg3Yy-RTLmgOM4pLYpTz_2Z27312GhQttLF1Tjo1rDBPq65tS2J_GbDPnBDQpNdtTl-7O4ZqDvv5/pub?gid=1729295615&single=true&output=csv';

// Initialize Tabletop
async function init() {
  try {
    const response = await fetch(SPREADSHEET_URL);
    const csvData = await response.text();
    const data = parseCSV(csvData);
    processData(data);
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById('products-table').innerHTML = 
      '<p class="error">Error loading data. Please refresh or try later.</p>';
  }
}

function parseCSV(csv) {
  const rows = csv.split('\n');
  const headers = rows[0].split(',').map(h => h.trim());
  
  return rows.slice(1).map(row => {
    const values = row.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] ? values[index].trim() : '';
      return obj;
    }, {});
  });
}

document.getElementById('search-input').addEventListener('input', (e) => {
  gtag('event', 'search', {
    search_term: e.target.value
  });
});

// Process sheet data
function processData(data, tabletop) {
  console.log("Raw data received:", data);  
if (data.length === 0) {
        document.getElementById('products-table').innerHTML = '<p>No products available</p>';
        return;
    }

    // Create table
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
        Object.values(item).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    document.getElementById('products-table').innerHTML = '';
    document.getElementById('products-table').appendChild(table);
    
    // Add search functionality
    setupSearch(data);
}

// Add search functionality
function setupSearch(data) {
    const searchInput = document.getElementById('search-input');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            const rowData = Object.values(data[index]).join(' ').toLowerCase();
            row.style.display = rowData.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);

// Add to script.js
function autoRefresh() {
    setTimeout(() => {
        Tabletop.init({
            key: SPREADSHEET_URL,
            callback: processData,
            simpleSheet: true
        });
        autoRefresh(); // Recall itself
    }, 300000); // 5 minutes
}

