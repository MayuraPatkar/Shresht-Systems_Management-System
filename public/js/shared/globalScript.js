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

// Sidebar navigation - add null checks for elements that may not exist on all pages
document.getElementById('dashboard')?.addEventListener('click', () => {
  window.location = '/dashboard';
  sessionStorage.setItem('currentTab', 'dashboard');
})

document.getElementById('quotation')?.addEventListener('click', () => {
  window.location = '/quotation';
  sessionStorage.setItem('currentTab', 'quotation');
})

document.getElementById('postOrder')?.addEventListener('click', () => {
  window.location = '/purchaseorder';
  sessionStorage.setItem('currentTab', 'purchaseorder');
})

document.getElementById('wayBill')?.addEventListener('click', () => {
  window.location = '/wayBill';
  sessionStorage.setItem('currentTab', 'wayBill');
})

document.getElementById('invoice')?.addEventListener('click', () => {
  window.location = '/invoice';
  sessionStorage.setItem('currentTab', 'invoice');
})

document.getElementById('service')?.addEventListener('click', () => {
  window.location = '/service';
  sessionStorage.setItem('currentTab', 'service');
})

document.getElementById('stock')?.addEventListener('click', () => {
  window.location = '/stock';
  sessionStorage.setItem('currentTab', 'stock');
})

document.getElementById('comms')?.addEventListener('click', () => {
  window.location = '/comms';
  sessionStorage.setItem('currentTab', 'comms');
})

document.getElementById('calculations')?.addEventListener('click', () => {
  window.location = '/calculations';
  sessionStorage.setItem('currentTab', 'calculations');
})

document.getElementById('settings')?.addEventListener('click', () => {
  window.location = '/settings';
  sessionStorage.setItem('currentTab', 'settings');
})

let currentStep = 1;

function moveNext() {
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.click();
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
const nextBtn = document.getElementById("next-btn");
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (currentStep < totalSteps) {
      changeStep(currentStep + 1);
      const idInput = document.getElementById('id');
      if (currentStep === totalSteps && !idInput?.value) getId();
      else if (currentStep === totalSteps && idInput?.value) generatePreview();
    }

    if (currentStep === 5 && sessionStorage.getItem('currentTab') === 'quotation') {
      // Use the new updateSpecificationsTable function that fetches from stock
      updateSpecificationsTable();
    }
  });
}

// Event listener for the "Previous" button
const prevBtn = document.getElementById("prev-btn");
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      changeStep(currentStep - 1);
    }
  });
}

// Function to change the current step
function changeStep(step) {
  const currentStepEl = document.getElementById(`step-${currentStep}`);
  const nextStepEl = document.getElementById(`step-${step}`);
  const stepIndicator = document.getElementById("step-indicator");
  
  if (currentStepEl) currentStepEl.classList.remove("active");
  currentStep = step;
  if (nextStepEl) nextStepEl.classList.add("active");
  updateNavigation();
  if (stepIndicator) stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Function to update the navigation buttons
function updateNavigation() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  
  if (prevBtn) prevBtn.disabled = currentStep === 1;
  if (nextBtn) nextBtn.disabled = currentStep === totalSteps;
}

// NOTE: Utility functions (numberToWords, formatIndian, formatDate) 
// have been moved to public/js/shared/utils.js

// Event listener for the "Add Item" button
const addItemBtnEl = document.getElementById('add-item-btn');
const addNonItemBtnEl = document.getElementById('add-non-item-btn');

if (addItemBtnEl) {
  addItemBtnEl.addEventListener('click', addItem);
}

if (addNonItemBtnEl) {
  addNonItemBtnEl.addEventListener('click', addNonItem);
}

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
  const container = document.getElementById("items-container");
  const tableBody = document.querySelector("#items-table tbody");
  const itemNumber = tableBody.children.length + 1;
  
  // Create card element
  const card = document.createElement("div");
  card.className = "item-card";
  
  card.innerHTML = `
    <div class="item-number">${itemNumber}</div>
    
    <div class="item-field description">
      <div style="position: relative;">
        <input type="text" placeholder="Enter item description" class="item_name" required>
        <ul class="suggestions"></ul>
      </div>
    </div>
    
    <div class="item-field hsn">
      <input type="text" placeholder="Code" required>
    </div>
    
    <div class="item-field qty">
      <input type="number" placeholder="0" min="1" required>
    </div>
    
    <div class="item-field price">
      <input type="number" placeholder="0.00" step="0.01" required>
    </div>
    
    <div class="item-field rate">
      <input type="number" placeholder="0" min="0" step="0.01">
    </div>
    
    <button type="button" class="remove-item-btn" title="Remove Item">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  
  // Append card to container
  if (container) {
    container.appendChild(card);
  }
  
  // Also add to hidden table for backward compatibility
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${itemNumber}</td>
    <td>
      <input type="text" placeholder="Item Description" class="item_name" required>
      <ul class="suggestions"></ul>
    </td>
    <td><input type="text" placeholder="HSN/SAC" required></td>
    <td><input type="number" placeholder="Qty" min="1" required></td>
    <td><input type="number" placeholder="Unit Price" required></td>
    <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
    <td><button type="button" class="remove-item-btn">Remove</button></td>
  `;
  tableBody.appendChild(row);

  // Setup autocomplete for the card
  const cardInput = card.querySelector(".item_name");
  const cardSuggestions = card.querySelector(".suggestions");
  
  cardInput.addEventListener("input", function () {
    showSuggestions(cardInput, cardSuggestions);
    // Update specifications table when item description changes (with debounce)
    clearTimeout(cardInput.specUpdateTimeout);
    cardInput.specUpdateTimeout = setTimeout(() => {
      if (cardInput.value.trim()) {
        updateSpecificationsTable();
      }
    }, 500);
  });

  cardInput.addEventListener("keydown", function (event) {
    handleKeyboardNavigation(event, cardInput, cardSuggestions);
  });

  // Close suggestions when clicking outside (handled by global listener below)
  
  // Also setup autocomplete for the table row input (backward compatibility)
  const tableInput = row.querySelector(".item_name");
  const tableSuggestions = row.querySelector(".suggestions");
  
  if (tableInput && tableSuggestions) {
    tableInput.addEventListener("input", function () {
      showSuggestions(tableInput, tableSuggestions);
      // Sync with card input
      if (cardInput) {
        cardInput.value = tableInput.value;
      }
      // Update specifications table when item description changes (with debounce)
      clearTimeout(tableInput.specUpdateTimeout);
      tableInput.specUpdateTimeout = setTimeout(() => {
        if (tableInput.value.trim()) {
          updateSpecificationsTable();
        }
      }, 500);
    });

    tableInput.addEventListener("keydown", function (event) {
      handleKeyboardNavigation(event, tableInput, tableSuggestions);
    });
  }
  
  // Sync all inputs from card to table
  const cardInputs = card.querySelectorAll("input");
  const tableInputs = row.querySelectorAll("input");
  
  cardInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (tableInputs[index]) {
        tableInputs[index].value = input.value;
      }
    });
  });
  
  // Handle remove button
  const removeBtn = card.querySelector(".remove-item-btn");
  removeBtn.addEventListener("click", function() {
    card.remove();
    row.remove();
    updateItemNumbers();
    updateSpecificationsTable();
  });
}

function addNonItem() {
  const container = document.getElementById("non-items-container");
  const tableBody = document.querySelector("#non-items-table tbody");
  const itemNumber = tableBody.children.length + 1;
  
  // Create card element
  const card = document.createElement("div");
  card.className = "non-item-card";
  
  card.innerHTML = `
    <div class="item-number">${itemNumber}</div>
    
    <div class="non-item-field description">
      <input type="text" placeholder="e.g., Installation Charges, Shipping" required>
    </div>
    
    <div class="non-item-field price">
      <input type="number" placeholder="0.00" step="0.01" required>
    </div>
    
    <div class="non-item-field rate">
      <input type="number" placeholder="0" min="0" step="0.01">
    </div>
    
    <button type="button" class="remove-item-btn" title="Remove Item">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  
  // Append card to container
  if (container) {
    container.appendChild(card);
  }
  
  // Also add to hidden table for backward compatibility
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${itemNumber}</td>
    <td>
      <input type="text" placeholder="Item Description" class="item_name" required>
      <ul class="suggestions"></ul>
    </td>
    <td><input type="number" placeholder="Price" required></td>
    <td><input type="number" placeholder="Rate"></td>
    <td><button type="button" class="remove-item-btn">Remove</button></td>
  `;
  tableBody.appendChild(row);

  // Setup input for the card
  const cardInput = card.querySelector("input[placeholder*='Installation']");
  
  cardInput.addEventListener("input", function () {
    // Update specifications table when item description changes (with debounce)
    clearTimeout(cardInput.specUpdateTimeout);
    cardInput.specUpdateTimeout = setTimeout(() => {
      if (cardInput.value.trim()) {
        updateSpecificationsTable();
      }
    }, 500);
  });
  
  // Sync inputs from card to table
  const cardInputs = card.querySelectorAll("input");
  const tableInputs = row.querySelectorAll("input");
  
  cardInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (tableInputs[index]) {
        tableInputs[index].value = input.value;
      }
    });
  });
  
  // Handle remove button
  const removeBtn = card.querySelector(".remove-item-btn");
  removeBtn.addEventListener("click", function() {
    card.remove();
    row.remove();
    updateNonItemNumbers();
    updateSpecificationsTable();
  });
}

// Helper function to update item numbers after removal
function updateItemNumbers() {
  const itemCards = document.querySelectorAll("#items-container .item-card");
  itemCards.forEach((card, index) => {
    const itemNumberElement = card.querySelector(".item-number");
    if (itemNumberElement) {
      itemNumberElement.textContent = index + 1;
    }
  });

  const tableRows = document.querySelectorAll("#items-table tbody tr");
  tableRows.forEach((row, index) => {
    const cell = row.querySelector("td:first-child");
    if (cell) {
      cell.textContent = index + 1;
    }
  });
}

// Helper function to update non-item numbers after removal
function updateNonItemNumbers() {
  const nonItemCards = document.querySelectorAll("#non-items-container .non-item-card");
  nonItemCards.forEach((card, index) => {
    const itemNumberElement = card.querySelector(".item-number");
    if (itemNumberElement) {
      itemNumberElement.textContent = index + 1;
    }
  });

  const tableRows = document.querySelectorAll("#non-items-table tbody tr");
  tableRows.forEach((row, index) => {
    const cell = row.querySelector("td:first-child");
    if (cell) {
      cell.textContent = index + 1;
    }
  });
}

// Function to show suggestions
function showSuggestions(input, suggestionsList) {
  const query = input.value.toLowerCase();
  suggestionsList.innerHTML = ""; // Clear old suggestions
  selectedIndex = -1; // Reset index when showing new suggestions

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
    li.onclick = async function () {
      input.value = item;
      // Trigger input event to sync description with table
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      const parent = input.closest('.item-card') || input.closest('tr');
      await fill(item, parent);
      suggestionsList.style.display = "none";
      // Update specifications table after selecting item
      if (sessionStorage.getItem('currentTab') === 'quotation') {
        setTimeout(() => updateSpecificationsTable(), 100);
      }
      // Reset selected index
      selectedIndex = -1;
    };
    suggestionsList.appendChild(li);
  });
}

// Function to handle arrow key navigation
async function handleKeyboardNavigation(event, input, suggestionsList) {
  const items = suggestionsList.querySelectorAll("li");
  if (items.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault(); // Prevent cursor movement and scrolling
    selectedIndex = (selectedIndex + 1) % items.length;
    input.value = items[selectedIndex].textContent;
    
    // Update visual selection
    items.forEach((item, index) => {
      item.classList.toggle("selected", index === selectedIndex);
    });
  } else if (event.key === "ArrowUp") {
    event.preventDefault(); // Prevent cursor movement and scrolling
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    input.value = items[selectedIndex].textContent;
    
    // Update visual selection
    items.forEach((item, index) => {
      item.classList.toggle("selected", index === selectedIndex);
    });
  } else if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    
    if (selectedIndex >= 0 && items[selectedIndex]) {
      const selectedItem = items[selectedIndex].textContent;
      input.value = selectedItem;
      suggestionsList.style.display = "none";
      
      // Trigger input event to sync description with table
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Fill other fields from stock data
      const parent = input.closest('.item-card') || input.closest('tr');
      await fill(selectedItem, parent);
      
      // Update specifications table after selection
      if (sessionStorage.getItem('currentTab') === 'quotation') {
        setTimeout(() => updateSpecificationsTable(), 100);
      }
      
      // Reset selected index
      selectedIndex = -1;
    }
    return;
  }
}

// Event listener for the "Remove Item" button
document.querySelector("#items-table")?.addEventListener("click", (event) => {
  if (event.target.classList.contains('remove-item-btn')) {
    event.target.closest('tr').remove();
    // Update specifications table after removing item
    setTimeout(() => updateSpecificationsTable(), 100);
  }
});

const nonItemsTable = document.querySelector("#non-items-table");
if (nonItemsTable) {
  nonItemsTable.addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
      event.target.closest('tr').remove();
      // Update specifications table after removing item
      setTimeout(() => updateSpecificationsTable(), 100);
    }
  });
}

if (sessionStorage.getItem('currentTab') === 'quotation') {
  const itemsSpecTable = document.querySelector("#items-specifications-table");
  if (itemsSpecTable) {
    itemsSpecTable.addEventListener("click", (event) => {
      if (event.target.classList.contains('remove-item-btn')) {
        event.target.closest('tr').remove();
      }
    });
  }
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
async function fill(itemName, element) {
  // Check if element is a card or a table row
  const isCard = element.classList.contains('item-card');
  
  const stockData = await fetchStockData(itemName);
  if (stockData) {
    if (isCard) {
      // Fill card inputs
      const inputs = element.querySelectorAll('input');
      inputs[1].value = stockData.HSN_SAC || ""; // HSN/SAC
      inputs[3].value = stockData.unitPrice || 0; // Unit Price
      inputs[4].value = stockData.GST || 0; // Rate
      
      // Trigger input events to sync with table
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[4].dispatchEvent(new Event('input', { bubbles: true }));
      
      // Also update corresponding table row
      const cardIndex = Array.from(document.querySelectorAll('#items-container .item-card')).indexOf(element);
      const tableRow = document.querySelector(`#items-table tbody tr:nth-child(${cardIndex + 1})`);
      if (tableRow) {
        tableRow.querySelector("input[placeholder='HSN/SAC']").value = stockData.HSN_SAC || "";
        tableRow.querySelector("input[placeholder='Unit Price']").value = stockData.unitPrice || 0;
        tableRow.querySelector("input[placeholder='Rate']").value = stockData.GST || 0;
      }
    } else {
      // Fill table row (backward compatibility)
      element.querySelector("input[placeholder='HSN/SAC']").value = stockData.HSN_SAC || "";
      element.querySelector("input[placeholder='Unit Price']").value = stockData.unitPrice || 0;
      element.querySelector("input[placeholder='Rate']").value = stockData.GST || 0;
    }
    
    // Update specifications table when item is filled
    if (sessionStorage.getItem('currentTab') === 'quotation') {
      setTimeout(() => updateSpecificationsTable(), 100);
    }
  }
}

// Function to update specifications table with stock data
async function updateSpecificationsTable() {
  const itemsTable = document.querySelector('#items-table tbody');
  const nonItemsTable = document.querySelector('#non-items-table tbody');
  const specificationsContainer = document.getElementById('specifications-container');
  const itemsSpecificationTable = document.querySelector('#items-specifications-table tbody');
  
  if (!itemsSpecificationTable && !specificationsContainer) return; // Not on quotation page
  
  // Store existing manually entered specifications to preserve them
  const existingSpecs = {};
  if (itemsSpecificationTable) {
    itemsSpecificationTable.querySelectorAll('tr').forEach(row => {
      const description = row.cells[1].textContent.trim();
      const specInput = row.querySelector('input[placeholder="Specifications"], input[type="text"]');
      if (specInput && description) {
        existingSpecs[description] = specInput.value;
      }
    });
  }
  
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
  
  // Clear and rebuild the specifications container and table
  if (specificationsContainer) {
    specificationsContainer.innerHTML = '';
  }
  if (itemsSpecificationTable) {
    itemsSpecificationTable.innerHTML = '';
  }
  
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
    
    // Create card for specifications
    if (specificationsContainer) {
      const card = document.createElement('div');
      card.className = 'spec-card';
      card.innerHTML = `
        <div class="item-number">${i + 1}</div>
        
        <div class="spec-field description">
          <input type="text" value="${item.description}" readonly style="background: #f9fafb; cursor: not-allowed;">
        </div>
        
        <div class="spec-field specification">
          <input type="text" placeholder="Enter specifications" value="${specification}" required>
        </div>
      `;
      specificationsContainer.appendChild(card);
      
      // Sync specification input with table
      const specInput = card.querySelector('.spec-field.specification input');
      const tableRow = document.querySelector(`#items-specifications-table tbody tr:nth-child(${i + 1})`);
      if (specInput && tableRow) {
        specInput.addEventListener('input', () => {
          const tableSpecInput = tableRow.querySelector('input');
          if (tableSpecInput) {
            tableSpecInput.value = specInput.value;
          }
        });
      }
    }
    
    // Also create hidden table row for backward compatibility
    if (itemsSpecificationTable) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td><input type="text" placeholder="Specifications" value="${specification}" required></td>
      `;
      itemsSpecificationTable.appendChild(row);
      
      // Sync table input with card
      const tableSpecInput = row.querySelector('input');
      const card = specificationsContainer?.querySelector(`.spec-card:nth-child(${i + 1})`);
      if (tableSpecInput && card) {
        tableSpecInput.addEventListener('input', () => {
          const cardSpecInput = card.querySelector('.spec-field.specification input');
          if (cardSpecInput) {
            cardSpecInput.value = tableSpecInput.value;
          }
        });
      }
    }
  }
}

// Event listener for item description input
const itemsTableInput = document.querySelector("#items-table");
if (itemsTableInput) {
  itemsTableInput.addEventListener("input", async (event) => {
    const row = event.target.closest("tr");

    if (event.target.placeholder === "Item Description" || event.target.placeholder === "HSN/SAC") {
      const itemName = row.querySelector("input[placeholder='Item Description']").value.trim();
      if (itemName.length > 2) { // Avoid unnecessary API calls for short inputs
        fill(itemName, row);
      }
    }
  });
}

// Event listener for non-item description input
const nonItemsTableInput = document.querySelector("#non-items-table");
if (nonItemsTableInput) {
  nonItemsTableInput.addEventListener("input", async (event) => {
    const row = event.target.closest("tr");

    if (event.target.placeholder === "Item Description") {
      const itemName = row.querySelector("input[placeholder='Item Description']").value.trim();
      if (itemName.length > 2) { // Avoid unnecessary API calls for short inputs
        fill(itemName, row);
      }
    }
  });
}

// Global click handler to close all suggestion dropdowns when clicking outside
document.addEventListener("click", function (event) {
  // Check if click is outside any suggestion list or input
  const allSuggestions = document.querySelectorAll('.suggestions');
  allSuggestions.forEach(suggestionsList => {
    const parentInput = suggestionsList.previousElementSibling || 
                       suggestionsList.parentElement?.querySelector('input.item_name');
    
    // Hide suggestions if click is outside both the input and suggestions list
    if (parentInput && 
        !parentInput.contains(event.target) && 
        !suggestionsList.contains(event.target)) {
      suggestionsList.style.display = "none";
    }
  });
});
