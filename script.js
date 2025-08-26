// script.js - Using JSONP approach
const scriptUrl = 'https://script.google.com/macros/s/AKfycbwZ1heBw1eECN5StH5C4TmwzA1h9py6Fz0ZikiV1GPiZLm40-QsSYMwdmZp3zJ2Q6h6GQ/exec';

let productData = [];
let dataLastUpdated = '';

function loadProductData() {
    console.log("Loading data using JSONP technique");
    
    // Create a script element for JSONP
    const script = document.createElement('script');
    script.src = scriptUrl + '?callback=handleData&random=' + new Date().getTime();
    document.head.appendChild(script);
}

// This function will be called by the JSONP response
function handleData(response) {
    if (response && response.success && response.data) {
        productData = response.data;
        processData(productData);
    } else {
        showError('Failed to load data: ' + (response.error || 'Unknown error'));
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
            lastUpdatedElement.textContent = dataLastUpdated;
        }
    }

    populateProductTable();
    clearError();
}

function populateProductTable() {
    const tableBody = document.getElementById('product-table');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (productData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center;">No products found.</td></tr>';
        return;
    }

    // Get headers from first item
    const headers = Object.keys(productData[0]);

    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        if (header === 'Last Updated') return;
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    tableBody.appendChild(headerRow);

    // Create data rows
    productData.forEach(product => {
        const row = document.createElement('tr');
        
        headers.forEach(header => {
            if (header === 'Last Updated') return;
            const cell = document.createElement('td');
            cell.textContent = product[header] || '-';
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

function showError(message) {
    console.error('Error:', message);
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

// Load data when page is ready
document.addEventListener('DOMContentLoaded', loadProductData);
