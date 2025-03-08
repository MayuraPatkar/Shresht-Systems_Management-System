function createServiceDiv(service) {
    const serviceDiv = document.createElement("div");
    serviceDiv.className = "record-item";
    serviceDiv.innerHTML = `
        <div class="details">
            <h3>${service.project_name}</h3>
            <h4>#${service.service_id}</h4>
        </div>
        <div class="actions">
            <button class="btn btn-primary open-service" data-id="${service.service_id}">Open</button>
            <button class="btn btn-danger delete-service" data-id="${service.service_id}">Delete</button>
        </div>
    `;
    return serviceDiv;
}

// Function to load remaining service data
async function loadService() {
    try {
        const response = await fetch("/service/get-service");
        if (!response.ok) throw new Error("Failed to fetch services.");

        const data = await response.json();
        const services = data.service;
        const serviceDiv = document.getElementsByClassName("record_list");

        serviceDiv.innerHTML = ""; // Clear existing services
        services.forEach(service => serviceDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error loading services:", error);
        window.electronAPI.showAlert("Failed to connect to server.");
    }
}

document.addEventListener("DOMContentLoaded", loadService);

// Handle search functionality
async function handleSearch() {
    const queryInput = document.getElementById("serviceSearchInput");
    const serviceListDiv = document.getElementById("service");

    if (!queryInput || !serviceListDiv) {
        console.error("Search input or service list container not found.");
        return;
    }

    const query = queryInput.value.trim();
    if (!query) {
        window.electronAPI.showAlert("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/service/search/${query}`);
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        const services = data.service;

        serviceListDiv.innerHTML = ""; // Clear old results
        if (services.length === 0) {
            serviceListDiv.innerHTML = `<p>No services found for "${query}"</p>`;
            return;
        }

        services.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI.showAlert("Failed to fetch service. Please try again later.");
    }
}

// Attach search event listener
document.getElementById("serviceSearchInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleSearch();
    }
});
