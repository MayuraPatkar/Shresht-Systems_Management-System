// Example: Switch active class on sidebar navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function () {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

document.getElementById('dashboard').addEventListener('click', () => {
  window.location = '/dashboard';
})

document.getElementById('quotation').addEventListener('click', () => {
  window.location = '/quotation';
})

document.getElementById('postOrder').addEventListener('click', () => {
  window.location = '/purchaseorder';
})

document.getElementById('wayBill').addEventListener('click', () => {
  window.location = '/wayBill';
})

document.getElementById('invoice').addEventListener('click', () => {
  window.location = '/invoice';
})

document.getElementById('service').addEventListener('click', () => {
  window.location = '/service';
})

document.getElementById('stock').addEventListener('click', () => {
  window.location = '/stock';
})

document.getElementById('employees').addEventListener('click', () => {
  window.location = '/employee';
})

document.getElementById('analytics').addEventListener('click', () => {
  window.location = '/analytics';
})

document.getElementById('settings').addEventListener('click', () => {
  window.location = '/settings';
})

// Add this JS at the end of your invoice.html or in a JS file
document.addEventListener("DOMContentLoaded", function () {
  const aside = document.querySelector("aside");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const newInvoiceBtn = document.getElementById("newInvoice");
  const homeSection = document.getElementById("home");
  const newSection = document.getElementById("new");

  // Show hamburger only on mobile
  function handleResize() {
    if (window.innerWidth <= 900) {
      sidebarToggle.style.display = "block";
    } else {
      sidebarToggle.style.display = "none";
      aside.classList.remove("show-sidebar", "hide-sidebar");
      sidebarOverlay.classList.remove("active");
    }
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  // Toggle sidebar
  sidebarToggle.addEventListener("click", function () {
    aside.classList.add("show-sidebar");
    sidebarOverlay.classList.add("active");
  });

  // Hide sidebar on overlay click
  sidebarOverlay.addEventListener("click", function () {
    aside.classList.remove("show-sidebar");
    sidebarOverlay.classList.remove("active");
  });

  // Hide sidebar when creating new invoice (slide out)
  newInvoiceBtn.addEventListener("click", function () {
    if (window.innerWidth <= 900) {
      aside.classList.remove("show-sidebar");
      sidebarOverlay.classList.remove("active");
    }
    if (homeSection) homeSection.style.display = "none";
    if (newSection) newSection.style.display = "block";
  });
});

let currentStep = 1;

function moveNext() {
  document.getElementById('nextBtn').click();
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    moveNext();
  }
});

// Event listener for the "Next" button
document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentStep < totalSteps) {
    changeStep(currentStep + 1);
    if (currentStep === totalSteps && !document.getElementById('Id').value) getId();
    else generatePreview();
  }
});

// Event listener for the "Previous" button
document.getElementById("prevBtn").addEventListener("click", () => {
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
  document.getElementById("prevBtn").disabled = currentStep === 1;
  document.getElementById("nextBtn").disabled = currentStep === totalSteps;
}

// Function to convert number to words (Indian numbering system)
function numberToWords(num) {
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

// Event listener for the "Add Item" button
document.getElementById('add-item-btn').addEventListener('click', addItem);

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
        <td>
            <input type="text" placeholder="Item Description" class="item_name" required>
            <ul class="suggestions"></ul> <!-- Changed from id to class -->
        </td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

  tableBody.appendChild(row);

  const input = row.querySelector(".item_name");
  const suggestionsList = row.querySelector(".suggestions");

  input.addEventListener("input", function () {
    showSuggestions(input, suggestionsList);
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
  }
});

// Fetch stock data from the backend
async function fetchStockData(itemName) {
  try {
    const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
    if (!response.ok) throw new Error('Stock not found');
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