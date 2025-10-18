// Example: Switch active class on sidebar navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function () {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    window.location = '/dashboard';
  }
});

document.getElementById('dashboard').addEventListener('click', () => {
  window.location = '/dashboard';
  sessionStorage.setItem('currentTab', 'dashboard');
})

document.getElementById('quotation').addEventListener('click', () => {
  window.location = '/quotation';
  sessionStorage.setItem('currentTab', 'quotation');
})

document.getElementById('postOrder').addEventListener('click', () => {
  window.location = '/purchaseorder';
  sessionStorage.setItem('currentTab', 'purchaseorder');
})

document.getElementById('wayBill').addEventListener('click', () => {
  window.location = '/wayBill';
  sessionStorage.setItem('currentTab', 'wayBill');
})

document.getElementById('invoice').addEventListener('click', () => {
  window.location = '/invoice';
  sessionStorage.setItem('currentTab', 'invoice');
})

document.getElementById('service').addEventListener('click', () => {
  window.location = '/service';
  sessionStorage.setItem('currentTab', 'service');
})

document.getElementById('stock').addEventListener('click', () => {
  window.location = '/stock';
  sessionStorage.setItem('currentTab', 'stock');
})

document.getElementById('comms').addEventListener('click', () => {
  window.location = '/comms';
  sessionStorage.setItem('currentTab', 'comms');
})

document.getElementById('calculations').addEventListener('click', () => {
  window.location = '/calculations';
  sessionStorage.setItem('currentTab', 'calculations');
})

document.getElementById('settings').addEventListener('click', () => {
  window.location = '/settings';
  sessionStorage.setItem('currentTab', 'settings');
})

let currentStep = 1;

function moveNext() {
  document.getElementById('next-btn').click();
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    moveNext();
  }
});

document.addEventListener("keydown", function (event) {
  // Prevent step change if focus is in an input, textarea, or contenteditable element
  const active = document.activeElement;
  if (
    active &&
    (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable
    )
  ) {
    return;
  }

  if (event.key === "Backspace") {
    if (currentStep > 1) {
      changeStep(currentStep - 1);
    }
  }
});

// Event listener for the "Next" button
document.getElementById("next-btn").addEventListener("click", () => {
  if (currentStep < totalSteps) {
    changeStep(currentStep + 1);
    if (currentStep === totalSteps && !document.getElementById('id').value) getId();
    else if (currentStep === totalSteps && document.getElementById('id').value) generatePreview();
  }

  if (currentStep === 5 && sessionStorage.getItem('currentTab') === 'quotation') {
    // Use the new updateSpecificationsTable function that fetches from stock
    updateSpecificationsTable();
  }
});

// Event listener for the "Previous" button
document.getElementById("prev-btn").addEventListener("click", () => {
  if (currentStep > 1) {
    changeStep(currentStep - 1);
  }
});

// Function to change the current step
function changeStep(step) {
  document.getElementById(`step-${currentStep}`).classList.remove("active");
  currentStep = step;
  document.getElementById(`step-${currentStep}`).classList.add("active");
  updateNavigation();
  document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Function to update the navigation buttons
function updateNavigation() {
  document.getElementById("prev-btn").disabled = currentStep === 1;
  document.getElementById("next-btn").disabled = currentStep === totalSteps;
}

// Function to convert number to words (Indian numbering system)
function numberToWords(num) {
  num = Math.round(num);
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const numToWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
    return '';
  };

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = [];

  if (crore) result.push(numToWords(crore) + ' Crore');
  if (lakh) result.push(numToWords(lakh) + ' Lakh');
  if (thousand) result.push(numToWords(thousand) + ' Thousand');
  if (remainder) result.push(numToWords(remainder));
  return result.join(' ').trim();
}

function formatIndian(num, fractionDigits = 0) {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

// Function to format date to YYYY-MM-DD
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Event listener for the "Add Item" button
document.getElementById('add-item-btn').addEventListener('click', addItem);
document.getElementById('add-non-item-btn').addEventListener('click', addNonItem);

let selectedIndex = -1;
let data = [];

// Fetch data from the server when the page loads
async function fetchData() {
  try {
    let response = await fetch('/stock/get-names');
    data = await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData(); // Load data at startup

// Function to add a new item row to the table
function addItem() {
  const tableBody = document.querySelector("#items-table tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
        <td>${tableBody.children.length + 1}</td>
        <td>
            <input type="text" placeholder="Item Description" class="item_name" required>
            <ul class="suggestions"></ul> <!-- Changed from id to class -->
        </td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="number" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

  tableBody.appendChild(row);

  const input = row.querySelector(".item_name");
  const suggestionsList = row.querySelector(".suggestions");

  input.addEventListener("input", function () {
    showSuggestions(input, suggestionsList);
    // Update specifications table when item description changes (with debounce)
    clearTimeout(input.specUpdateTimeout);
    input.specUpdateTimeout = setTimeout(() => {
      if (input.value.trim()) {
        updateSpecificationsTable();
      }
    }, 500);
  });

  input.addEventListener("keydown", function (event) {
    handleKeyboardNavigation(event, input, suggestionsList);
  });

  document.addEventListener("click", function (event) {
    if (!input.contains(event.target) && !suggestionsList.contains(event.target)) {
      suggestionsList.style.display = "none";
    }
  });
}

function addNonItem() {
  const tableBody = document.querySelector("#non-items-table tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
        <td>${tableBody.children.length + 1}</td>
        <td>
            <input type="text" placeholder="Item Description" class="item_name" required>
            <ul class="suggestions"></ul> <!-- Changed from id to class -->
        </td>
        <td><input type="number" placeholder="Price" required></td>
        <td><input type="number" placeholder="Rate"></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

  tableBody.appendChild(row);

  const input = row.querySelector(".item_name");
  const suggestionsList = row.querySelector(".suggestions");

  input.addEventListener("input", function () {
    showSuggestions(input, suggestionsList);
    // Update specifications table when item description changes (with debounce)
    clearTimeout(input.specUpdateTimeout);
    input.specUpdateTimeout = setTimeout(() => {
      if (input.value.trim()) {
        updateSpecificationsTable();
      }
    }, 500);
  });

  input.addEventListener("keydown", function (event) {
    handleKeyboardNavigation(event, input, suggestionsList);
  });

  document.addEventListener("click", function (event) {
    if (!input.contains(event.target) && !suggestionsList.contains(event.target)) {
      suggestionsList.style.display = "none";
    }
  });
}

// Function to show suggestions
function showSuggestions(input, suggestionsList) {
  const query = input.value.toLowerCase();
  suggestionsList.innerHTML = ""; // Clear old suggestions
  selectedIndex = -1; // Reset index

  if (query.length === 0) {
    suggestionsList.style.display = "none";
    return;
  }

  const filtered = data.filter(item => item.toLowerCase().includes(query));

  if (filtered.length === 0) {
    suggestionsList.style.display = "none";
    return;
  }

  suggestionsList.style.display = "block";

  filtered.forEach((item, index) => {
    let li = document.createElement("li");
    li.textContent = item;
    li.onclick = function () {
      input.value = item;
      fill(item, input.closest("tr"));
      suggestionsList.style.display = "none";
    };
    suggestionsList.appendChild(li);
  });
}

// Function to handle arrow key navigation
function handleKeyboardNavigation(event, input, suggestionsList) {
  const items = suggestionsList.querySelectorAll("li");
  if (items.length === 0) return;

  if (event.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % items.length;
    input.value = items[selectedIndex].textContent;
    fill(items[selectedIndex].textContent, input.closest("tr"));
  } else if (event.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    input.value = items[selectedIndex].textContent;
    fill(items[selectedIndex].textContent, input.closest("tr"));
  } else if (event.key === "Enter") {
    event.stopPropagation();
    if (selectedIndex >= 0) {
      suggestionsList.style.display = "none";
    }
    return;
  }

  items.forEach((item, index) => {
    item.classList.toggle("selected", index === selectedIndex);
  });
}

// Event listener for the "Remove Item" button
document.querySelector("#items-table").addEventListener("click", (event) => {
  if (event.target.classList.contains('remove-item-btn')) {
    event.target.closest('tr').remove();
    // Update specifications table after removing item
    setTimeout(() => updateSpecificationsTable(), 100);
  }
});

document.querySelector("#non-items-table").addEventListener("click", (event) => {
  if (event.target.classList.contains('remove-item-btn')) {
    event.target.closest('tr').remove();
    // Update specifications table after removing item
    setTimeout(() => updateSpecificationsTable(), 100);
  }
});

if (sessionStorage.getItem('currentTab') === 'quotation'  ) {
  document.querySelector("#items-specifications-table").addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
      event.target.closest('tr').remove();
    }
  });
}

// Fetch stock data from the backend
async function fetchStockData(itemName) {
  try {
    const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching stock data:", error);
    return null;
  }
}

// Function to autofill row data
async function fill(itemName, row) {
  const stockData = await fetchStockData(itemName);
  if (stockData) {
    row.querySelector("input[placeholder='HSN/SAC']").value = stockData.HSN_SAC || "";
    row.querySelector("input[placeholder='Unit Price']").value = stockData.unitPrice || 0;
    row.querySelector("input[placeholder='Rate']").value = stockData.GST || 0;
    
    // Update specifications table when item is filled
    updateSpecificationsTable();
  }
}

// Function to update specifications table with stock data
async function updateSpecificationsTable() {
  const itemsTable = document.querySelector('#items-table tbody');
  const nonItemsTable = document.querySelector('#non-items-table tbody');
  const itemsSpecificationTable = document.querySelector('#items-specifications-table tbody');
  
  if (!itemsSpecificationTable) return; // Not on quotation page
  
  // Store existing manually entered specifications to preserve them
  const existingSpecs = {};
  itemsSpecificationTable.querySelectorAll('tr').forEach(row => {
    const description = row.cells[1].textContent.trim();
    const specInput = row.querySelector('input[placeholder="Specifications"], input[type="text"]');
    if (specInput && description) {
      existingSpecs[description] = specInput.value;
    }
  });
  
  // Get all current items from both tables
  const allItems = [
    ...Array.from(itemsTable.querySelectorAll('tr')).map(row => ({
      description: row.querySelector('input[placeholder="Item Description"]')?.value.trim() || '',
      type: 'item'
    })),
    ...Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
      description: row.querySelector('input[placeholder="Item Description"]')?.value.trim() || '',
      type: 'non_item'
    }))
  ];
  
  // Clear and rebuild the specifications table
  itemsSpecificationTable.innerHTML = '';
  
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (!item.description) continue;
    
    let specification = '';
    
    // First check if user has manually entered specification
    if (existingSpecs[item.description]) {
      specification = existingSpecs[item.description];
    } else {
      // Try to fetch from stock
      try {
        const stockData = await fetchStockData(item.description);
        if (stockData && stockData.specifications) {
          specification = stockData.specifications;
        }
      } catch (error) {
        console.log("No stock data found for:", item.description);
      }
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${item.description}</td>
      <td><input type="text" placeholder="Specifications" value="${specification}" required></td>
    `;
    itemsSpecificationTable.appendChild(row);
  }
}

// Event listener for item description input
document.querySelector("#items-table").addEventListener("input", async (event) => {
  const row = event.target.closest("tr");

  if (event.target.placeholder === "Item Description" || event.target.placeholder === "HSN/SAC") {
    const itemName = row.querySelector("input[placeholder='Item Description']").value.trim();
    if (itemName.length > 2) { // Avoid unnecessary API calls for short inputs
      fill(itemName, row);
    }
  }
});

// Event listener for non-item description input
document.querySelector("#non-items-table").addEventListener("input", async (event) => {
  const row = event.target.closest("tr");

  if (event.target.placeholder === "Item Description") {
    const itemName = row.querySelector("input[placeholder='Item Description']").value.trim();
    if (itemName.length > 2) { // Avoid unnecessary API calls for short inputs
      fill(itemName, row);
    }
  }
});
