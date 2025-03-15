// Redirect to dashboard when logo is clicked
document.getElementById('logo').addEventListener('click', () => {
  window.location = '/dashboard';
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
}

// Function to update the navigation buttons
function updateNavigation() {
  document.getElementById("prevBtn").disabled = currentStep === 1;
  document.getElementById("nextBtn").disabled = currentStep === totalSteps;
}

// Show a confirmation box
function showConfirmBox(message, onConfirm, onCancel) {
  const confirmBox = document.getElementById('confirm_box');
  const messageElement = document.getElementById('message');
  const yesButton = document.getElementById('yes');
  const noButton = document.getElementById('no');

  messageElement.textContent = message;
  confirmBox.style.display = 'block';

  yesButton.onclick = () => {
    confirmBox.style.display = 'none';
    if (onConfirm) onConfirm();
  };

  noButton.onclick = () => {
    confirmBox.style.display = 'none';
    if (onCancel) onCancel();
  };
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

// Function to add a new item row to the table
function addItem() {
  const tableBody = document.querySelector("#items-table tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

  tableBody.appendChild(row);
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

// Event listener for item description or item code input
document.querySelector("#items-table").addEventListener("input", async (event) => {
  const row = event.target.closest("tr");

  if (event.target.placeholder === "Item Description" || event.target.placeholder === "HSN/SAC") {
      const itemName = row.querySelector("input[placeholder='Item Description']").value.trim();
      
      if (itemName.length > 2) { // Avoid unnecessary API calls for short inputs
          const stockData = await fetchStockData(itemName);
          if (stockData) {
              row.querySelector("input[placeholder='HSN/SAC']").value = stockData.HSN_SAC || "";
              row.querySelector("input[placeholder='Unit Price']").value = stockData.unitPrice || 0;
              row.querySelector("input[placeholder='Rate']").value = stockData.GST || 0;
          }
      }
  }
});