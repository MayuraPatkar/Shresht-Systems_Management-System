// Redirect to dashboard when logo is clicked
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

let currentStep = 1;

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

// Function to convert number to words
function numberToWords(num) {
    const a = [
      '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
    ];
    const b = [
      '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];
  
    const numToWords = (n) => {
      if (n < 20) return a[n];
      const digit = n % 10;
      if (n < 100) return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 === 0 ? '' : ' and ' + numToWords(n % 100));
      return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    };
  
    if (num === 0) return 'zero';
  
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;
  
    let result = '';
  
    if (crore) {
      result += numToWords(crore) + ' crore';
    }
  
    if (lakh) {
      result += (result ? ' ' : '') + numToWords(lakh) + ' lakh';
    }
  
    if (thousand) {
      result += (result ? ' ' : '') + numToWords(thousand) + ' thousand';
    }
  
    if (remainder) {
      result += (result ? ' ' : '') + numToWords(remainder);
    }
  
    return result;
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