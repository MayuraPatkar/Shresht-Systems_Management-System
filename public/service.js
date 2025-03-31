const serviceDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadService();

    if (serviceDiv) {
        serviceDiv.addEventListener("click", handleServiceListClick);
    }

    document.getElementById('seviceSearchBtn')?.addEventListener('click', handleSearch);
});

let currentStep = 1;
const totalSteps = 2;

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
        if (currentStep === totalSteps) generatePreview();
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

// Function to create service item element
function createServiceDiv(service) {
    const serviceDiv = document.createElement("div");
    serviceDiv.className = "record-item";
    serviceDiv.innerHTML = `
        <div class="details">
            <h3>${service.project_name}</h3>
            <h4>#${service.invoice_id}</h4>
        </div>
        <div class="actions">
            <button class="btn btn-primary open-service" data-id="${service.invoice_id}">Open</button>
            <button class="btn btn-danger delete-service" data-id="${service.invoice_id}">Delete</button>
        </div>
    `;
    document.getElementById('Id').value = service.invoice_id;
    document.getElementById('projectName').value = service.project_name;
    document.getElementById('name').value = service.buyer_name;
    document.getElementById('address').value = service.buyer_address;
    document.getElementById('phone').value = service.buyer_phone;
    return serviceDiv;
}

// Function to load service data
async function loadService() {
    try {
        const response = await fetch("/service/get-service");
        if (!response.ok) throw new Error("Failed to fetch services.");

        const services = await response.json();

        const serviceListDiv = document.querySelector(".record_list");
        if (!serviceListDiv) {
            console.error("Service list container not found.");
            return;
        }

        serviceListDiv.innerHTML = ""; // Clear existing services

        if (!services.projects || services.projects.length === 0) {
            serviceListDiv.innerHTML = `<p>No services available.</p>`;
            return;
        }

        services.projects.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error loading services:", error);
        window.electronAPI?.showAlert("Failed to connect to server.");
    }
}

// Function to handle search functionality
async function handleSearch() {
    const queryInput = document.getElementById("serviceSearchInput");
    const serviceListDiv = document.querySelector(".record_list");

    if (!queryInput || !serviceListDiv) {
        console.error("Search input or service list container not found.");
        return;
    }

    const query = queryInput.value.trim();
    if (!query) {
        window.electronAPI?.showAlert("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/service/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        const services = data.service || [];

        serviceListDiv.innerHTML = ""; // Clear old results

        if (services.length === 0) {
            serviceListDiv.innerHTML = `<p>No services found for "${query}"</p>`;
            return;
        }

        services.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert("Failed to fetch service. Please try again later.");
    }
}

// Attach search event listener
document.getElementById("serviceSearchInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleSearch();
    }
});

// Handle click events on the service list
async function handleServiceListClick(event) {
    const target = event.target;
    const serviceId = target.getAttribute("data-id");

    if (!serviceId) return;

    if (target.classList.contains("open-service")) {
        await openService(serviceId);
    } else if (target.classList.contains("delete-service")) {
        window.electronAPI.showAlert2('Are you sure you want to delete this service?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteService(serviceId);
                }
            });
        }
    };
}


// Function to open a service form
async function openService(serviceId) {
    try {
        const response = await fetch(`/invoice/${serviceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch service");
        }

        const data = await response.json();
        const service = data.invoice;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';

    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert("Failed to fetch service. Please try again later.");
    }
}

// Function to delete a service
async function deleteService(serviceId) {
    try {
        const response = await fetch(`/invoice/${serviceId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete service");
        }

        window.electronAPI?.showAlert("Service deleted successfully.");
    } catch (error) {
        console.error("Error deleting service:", error);
        window.electronAPI?.showAlert("Failed to delete service. Please try again later.");
    }
}


// Function to generate the preview
function generatePreview() {
    const service_id = document.getElementById('Id').value;
    const name = document.getElementById("name").value || "";
    const address = document.getElementById("address").value || "";
    const phone = document.getElementById("phone").value || "";
    const payment = document.getElementById("payment").value || "";


    document.getElementById("preview-content").innerHTML = `
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Service #${service_id}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong>
                ${name}<br>
                ${address}</br>
                ${phone}
                </p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${document.getElementById("projectName").value}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="third-section">
        <div class="totals-section" style="text-align: right;">
            Total: ${payment}
        </div>
        </div>
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(payment)} Only</span></p>
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <footer>
            <p>This is a computer-generated purchase order</p>
        </footer>
    </div>`;
}

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        let name = `Service`;
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Function to collect form data and send to server
async function sendToServer(data) {
    try {
        const response = await fetch("/service/update-nextService", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert("Failed to connect to server.");
    }
}


// Function to collect form data
function collectFormData() {
    return {
        invoice_id: document.getElementById("Id").value,
        next_service: document.querySelector('input[name="question"]:checked')?.value || null,
    };
}