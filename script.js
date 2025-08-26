// script.js
// URL for the Google Apps Script that fetches our product data CSV
const csvUrl = 'https://script.google.com/macros/s/AKfycby5f13M-UOjuRLGcIhGkDD_WVvCzI2XIRrhLSXfc4aYjc2CFOSaz9eIcQiVwgTiOa6mHw/exec';

// This object will hold our product data
let productData = [];
let dataLastUpdated = '';

// Main function to load the product data
function loadProductData() {
    fetch(csvUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            processData(csvText); // Process the CSV text into product data
        })
        .catch(error => {
            console.error('Error loading data:', error);
            document.getElementById('error-message').textContent = `Error loading data: ${error.message}`;
        });
}

// Function to process the CSV data and populate the table
function processData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        throw new Error("CSV data is not in the expected format.");
    }

    // Get the headers from the first line
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Clear the existing product data
    productData = [];

    // Process each line of data (skipping the header line)
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
        const product = {};

        // Create a product object using the headers as keys
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });

        productData.push(product);
    }

    // Check if we have a 'Last Updated' column in the first product to display it
    if (productData.length > 0 && productData[0]['Last Updated']) {
        dataLastUpdated = productData[0]['Last Updated'];
        document.getElementById('last-updated').textContent = dataLastUpdated;
    }

    // Populate the table with the new data
    populateProductTable();
    document.getElementById('error-message').textContent = ''; // Clear any errors
}

// Function to create and display the product table
function populateProductTable() {
    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = ''; // Clear the table first

    if (productData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center;">No products found.</td></tr>';
        return;
    }

    // Get the headers from the first product object
    const headers = Object.keys(productData[0]);

    // Create a row for each product
    productData.forEach(product => {
        const row = document.createElement('tr');
        
        // Create a cell for each header
        headers.forEach(header => {
            // Skip the 'Last Updated' header for the table, we display it separately
            if (header === 'Last Updated') return;
            
            const cell = document.createElement('td');
            cell.textContent = product[header] || '-';
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

// COMMENTED OUT THE UNNECESSARY CURRENCY/CALCULATION CODE
/*
let exchangeRates = {};
let lastUpdated = '';

function populateCurrencies() {
    // ... currency code ...
}

function calculate() {
    // ... calculation code ...
}
*/

// Remove event listeners for the currency converter inputs since we don't need them
/*
document.getElementById('amount').removeEventListener('input', calculate);
document.getElementById('from').removeEventListener('change', calculate);
document.getElementById('to').removeEventListener('change', calculate);
*/

// Load the product data when the page is ready
document.addEventListener('DOMContentLoaded', loadProductData);

// COMMENTED OUT THE BROKEN PDF EXPORT FUNCTIONALITY
/*
function exportToPDF() {
    // ... existing pdf code ...
}
*/
