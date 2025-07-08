const serviceRecordsDiv = document.querySelector(".records");
const totalSteps = 2;

document.addEventListener("DOMContentLoaded", () => {
    loadService();

    if (serviceRecordsDiv) {
        serviceRecordsDiv.addEventListener("click", handleServiceListClick);
    }

    document.getElementById('search-input')?.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    });
});

function getId(){
    generatePreview()
}

// Create service card
function createServiceDiv(service) {
    const div = document.createElement("div");
    div.className = "record-item";
    div.innerHTML = `
    <div class="paid-icon">
        <img src="../assets/telemarketing.png" alt="Icon">
    </div>
    <div class="details">
        <div class="info1">
            <h1>${service.project_name}</h1>
            <h4>#${service.invoice_id}${service.service_stage + 1}</h4>
        </div>
        <div class="info2">
            <p>${service.customer_name}</p>
            <p>${service.customer_address}</p>
        </div>    
    </div>
    <div class="actions">
        <button class="btn btn-primary open-service" data-id="${service.invoice_id}">Open</button>
    </div>
    `;
    return div;
}

// Load service data
async function loadService() {
    try {
        const response = await fetch("/service/get-service");
        if (!response.ok) throw new Error("Failed to fetch services.");

        const services = await response.json();

        const serviceListDiv = document.querySelector(".records");
        if (!serviceListDiv) {
            console.error("Service list container not found.");
            return;
        }

        serviceListDiv.innerHTML = "";

        if (!services.projects || services.projects.length === 0) {
            serviceListDiv.innerHTML = `<h1>No services available</h1>`;
            return;
        }

        services.projects.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error loading services:", error);
        window.electronAPI?.showAlert1("Failed to connect to server.");
    }
}

// Search functionality
async function handleSearch() {
    const queryInput = document.getElementById("search-input");
    const serviceListDiv = document.querySelector(".records");

    if (!queryInput || !serviceListDiv) {
        console.error("Search input or service list container not found.");
        return;
    }

    const query = queryInput.value.trim();
    if (!query) {
        window.electronAPI?.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/service/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        const services = data.service || [];

        serviceListDiv.innerHTML = "";

        if (services.length === 0) {
            serviceListDiv.innerHTML = `<p>No services found for "${query}"</p>`;
            return;
        }

        services.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Handle click events on the service list
async function handleServiceListClick(event) {
    const target = event.target;
    const serviceId = target.getAttribute("data-id");

    if (!serviceId) return;

    if (target.classList.contains("open-service")) {
        await openService(serviceId);
    }
}

// Open a service form
async function openService(serviceId) {
    try {
        const response = await fetch(`/invoice/${serviceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch service");
        }

        const data = await response.json();
        const service = data.invoice;

        // Fill form fields (IDs match HTML)
        document.getElementById('service-id').value = service.invoice_id || '';
        document.getElementById('invoice-id').value = service.invoice_id || '';
        document.getElementById('project-name').value = service.project_name || '';
        document.getElementById('name').value = service.customer_name || '';
        document.getElementById('address').value = service.customer_address || '';
        document.getElementById('phone').value = service.customer_phone || '';
        document.getElementById('service-stage').value = service.service_stage || '';

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';

    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Generate the preview
function generatePreview() {
    const serviceId = document.getElementById('service-id').value;
    const name = document.getElementById("name").value || "";
    const address = document.getElementById("address").value || "";
    const phone = document.getElementById("phone").value || "";
    const payment = document.getElementById("payment").value || "";

    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Service #${serviceId}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong>
                ${name}<br>
                ${address}</br>
                ${phone}
                </p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${document.getElementById("project-name").value}</p>
                <p><strong>Date:</strong> ${document.getElementById("date").value || new Date().toLocaleDateString()}</p>
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

// Print and Save as PDF
document.getElementById("print-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-pdf-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        let name = `Service`;
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Save button
document.getElementById("save-btn").addEventListener("click", async () => {
    const serviceData = collectFormData();
    const ok = await sendToServer(serviceData);
    if (ok) {
        window.electronAPI?.showAlert1("Service saved successfully.");
    } else {
        window.electronAPI?.showAlert1("Failed to save service.");
    }
});

// Send to server
async function sendToServer(data) {
    try {
        const response = await fetch("/service/save-service", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
            return true;
        } else {
            window.electronAPI?.showAlert1("Failed to save service.");
            return false;
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
        return false;
    }
}

// Collect form data
function collectFormData() {
    return {
        service_id: document.getElementById("service-id").value,
        invoice_id: document.getElementById("invoice-id").value,
        fee_amount: document.getElementById("payment")?.value || null,
        service_date: document.getElementById("date")?.value || new Date().toISOString().slice(0, 10),
        service_stage: Number(document.getElementById("service-stage")?.value) || 1
    };
}