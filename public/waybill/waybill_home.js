// Sidebar navigation active state and navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Sidebar navigation routing (IDs must match HTML)
document.getElementById('dashboard').addEventListener('click', () => {
    window.location = '/dashboard';
    sessionStorage.setItem('currentTab', 'dashboard');
})

document.getElementById('quotation').addEventListener('click', () => {
    window.location = '/quotation';
    sessionStorage.setItem('currentTab', 'quotation');
})

document.getElementById('purchase-bill').addEventListener('click', () => {
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

document.getElementById('home-btn').addEventListener('click', () => {
    window.location = '/wayBill';
    sessionStorage.setItem('currentTab', 'wayBill');
})

// Main content references
const wayBillsListDiv = document.querySelector(".records");

// Header buttons
document.addEventListener("DOMContentLoaded", () => {
    loadRecentWayBills();
    document.getElementById('new-waybill-btn').addEventListener('click', showNewWayBillForm);
    document.getElementById('search-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
    document.getElementById('view-preview-btn').addEventListener('click', () => {
        changeStep(totalSteps);
        generatePreview();
    });
    document.getElementById('view-preview-btn').style.display = 'none';

    // Keyboard shortcuts modal handlers
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeShortcutsBtn = document.getElementById('close-shortcuts');

    shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.remove('hidden');
    });

    closeShortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            shortcutsModal.classList.add('hidden');
        }
    });
});

// Step navigation
let currentStep = 1;
const totalSteps = 6;

document.getElementById("next-btn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        if (currentStep === totalSteps) generatePreview();
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
});

document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }
});

function updateNavigation() {
    document.getElementById("prev-btn").disabled = currentStep === 1;
    document.getElementById("next-btn").disabled = currentStep === totalSteps;
}

// Keyboard navigation
function moveNext() {
    document.getElementById('next-btn').click();
}

// Comprehensive keyboard shortcuts
document.addEventListener("keydown", function (event) {
    const active = document.activeElement;
    const isTyping = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
    );

    // Enter key - move to next step (only when not typing)
    if (event.key === "Enter" && !isTyping) {
        event.preventDefault();
        moveNext();
    }

    // Backspace - go to previous step (only when not typing)
    if (event.key === "Backspace" && !isTyping) {
        event.preventDefault();
        if (currentStep > 1) {
            changeStep(currentStep - 1);
        }
    }

    // Ctrl/Cmd + N - New Waybill
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        const newBtn = document.getElementById('new-waybill-btn');
        if (newBtn.style.display !== 'none') {
            newBtn.click();
        }
    }

    // Ctrl/Cmd + H - Go Home
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        window.location = '/wayBill';
    }

    // Ctrl/Cmd + P - View Preview (when in form)
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        const previewBtn = document.getElementById('view-preview-btn');
        if (previewBtn.style.display !== 'none') {
            previewBtn.click();
        }
    }

    // Ctrl/Cmd + S - Save (when on preview step)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn && currentStep === totalSteps) {
            saveBtn.click();
        }
    }

    // Ctrl/Cmd + Shift + P - Print (when on preview step)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        const printBtn = document.getElementById('print-btn');
        if (printBtn && currentStep === totalSteps) {
            printBtn.click();
        }
    }

    // Ctrl/Cmd + I - Add Item (when on items step)
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        if (currentStep === 5) {
            document.getElementById('add-item-btn').click();
        }
    }

    // Arrow Right - Next step
    if (event.key === "ArrowRight" && !isTyping) {
        event.preventDefault();
        if (currentStep < totalSteps) {
            document.getElementById('next-btn').click();
        }
    }

    // Arrow Left - Previous step
    if (event.key === "ArrowLeft" && !isTyping) {
        event.preventDefault();
        if (currentStep > 1) {
            document.getElementById('prev-btn').click();
        }
    }

    // Number keys 1-6 - Jump to specific step
    if (!isTyping && event.key >= '1' && event.key <= '6') {
        const stepNum = parseInt(event.key);
        if (stepNum <= totalSteps) {
            event.preventDefault();
            changeStep(stepNum);
        }
    }

    // Escape - Go back to home
    if (event.key === "Escape") {
        event.preventDefault();
        const homeView = document.getElementById('home');
        const newView = document.getElementById('new');
        const viewSection = document.getElementById('view');
        const shortcutsModal = document.getElementById('shortcuts-modal');

        // Close shortcuts modal if open
        if (!shortcutsModal.classList.contains('hidden')) {
            shortcutsModal.classList.add('hidden');
            return;
        }

        // Otherwise go back to home
        if (newView.style.display === 'block' || viewSection.style.display === 'block') {
            window.location = '/wayBill';
        }
    }

    // ? key - Show keyboard shortcuts
    if (event.key === '?' && !isTyping) {
        event.preventDefault();
        const shortcutsModal = document.getElementById('shortcuts-modal');
        shortcutsModal.classList.remove('hidden');
    }

    // Ctrl/Cmd + F - Focus on search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
});

// Change step function
function changeStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Load recent way bills from the server
async function loadRecentWayBills() {
    try {
        const response = await fetch(`/wayBill/recent-way-bills`);
        if (!response.ok) {
            wayBillsListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-gray-100 rounded-full p-8 mb-4">
                        <i class="fas fa-inbox text-gray-400 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Waybills Found</h2>
                    <p class="text-gray-500 mb-6">Get started by creating your first way bill</p>
                    <button id="new-waybill-btn-2"" 
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                        <i class="fas fa-plus"></i>
                        Create Way Bill
                    </button>
                </div>
            `;
            return;
        }
        const data = await response.json();
        renderWayBills(data.wayBill);
    } catch (error) {
        console.error("Error loading way bills:", error);
        wayBillsListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-red-100 rounded-full p-8 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Way Bills</h2>
                <p class="text-gray-500 mb-6">Please try again later</p>
                <button onclick="loadRecentWayBills()" 
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// Render way bills in the list
function renderWayBills(wayBills) {
    wayBillsListDiv.innerHTML = "";
    if (!wayBills || wayBills.length === 0) {
        wayBillsListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-gray-100 rounded-full p-8 mb-4">
                    <i class="fas fa-inbox text-gray-400 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Waybills Found</h2>
                <p class="text-gray-500 mb-6">Get started by creating your first way bill</p>
                <button onclick="document.getElementById('new-waybill-btn').click()" 
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-plus"></i>
                    Create Way Bill
                </button>
            </div>
        `;
        return;
    }
    wayBills.forEach(wayBill => {
        const wayBillDiv = createWayBillCard(wayBill);
        wayBillsListDiv.appendChild(wayBillDiv);
    });
}

// Create a way bill card element
function createWayBillCard(wayBill) {
    const wayBillDiv = document.createElement("div");
    wayBillDiv.className = "bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow fade-in";
    wayBillDiv.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex items-start gap-4 flex-1">
                <div class="bg-blue-100 p-3 rounded-lg">
                    <i class="fas fa-route text-blue-600 text-2xl"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-1">${wayBill.project_name}</h3>
                            <p class="text-sm text-gray-500 font-mono">${wayBill.waybill_id}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Customer</p>
                            <p class="text-sm font-semibold text-gray-700">${wayBill.customer_name}</p>
                            <p class="text-xs text-gray-500 mt-1">${wayBill.customer_address}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Destination</p>
                            <p class="text-sm font-semibold text-gray-700">${wayBill.place_supply}</p>
                        </div>
                    </div>
                </div>
            </div>
            <select class="ml-4 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="" disabled selected>Actions</option>
                <option value="view">👁️ View</option>
                <option value="update">✏️ Update</option>
                <option value="delete">🗑️ Delete</option>
            </select>
        </div>
    `;
    wayBillDiv.querySelector('select').addEventListener('change', function () {
        handleWayBillAction(this, wayBill.waybill_id);
    });
    return wayBillDiv;
}

// Handle actions from the actions dropdown
function handleWayBillAction(select, wayBillId) {
    const action = select.value;
    if (action === "view") {
        viewWayBill(wayBillId);
    } else if (action === "update") {
        openWayBill(wayBillId);
    } else if (action === "delete") {
        window.electronAPI.showAlert2('Are you sure you want to delete this way bill?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteWayBill(wayBillId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

// Delete a way bill
async function deleteWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete way bill");
        }

        window.electronAPI.showAlert1("Way bill deleted successfully");
        loadRecentWayBills();
    } catch (error) {
        console.error("Error deleting way bill:", error);
        window.electronAPI.showAlert1("Failed to delete way bill. Please try again later.");
    }
}

// Show the new way bill form
function showNewWayBillForm() {
    // Hide other sections
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('view').style.display = 'none';

    // Update header buttons
    document.getElementById('new-waybill-btn').style.display = 'none';
    document.getElementById('view-preview-btn').style.display = 'block';

    // Reset form
    document.getElementById('waybill-form').reset();

    // Clear items table
    const itemsTableBody = document.querySelector("#items-table tbody");
    if (itemsTableBody) {
        itemsTableBody.innerHTML = "";
    }

    // Reset to step 1
    document.querySelectorAll('.steps').forEach(step => step.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    currentStep = 1;
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/wayBill/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            wayBillsListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-yellow-100 rounded-full p-8 mb-4">
                        <i class="fas fa-search text-yellow-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                    <p class="text-gray-500 mb-2">No way bills match "${query}"</p>
                    <button onclick="document.getElementById('search-input').value=''; loadRecentWayBills();" 
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium mt-4">
                        <i class="fas fa-list"></i>
                        Show All Way Bills
                    </button>
                </div>
            `;
            return;
        }

        const data = await response.json();
        const wayBills = data.wayBills;
        wayBillsListDiv.innerHTML = "";
        (wayBills || []).forEach(wayBill => {
            const wayBillDiv = createWayBillCard(wayBill);
            wayBillsListDiv.appendChild(wayBillDiv);
        });
    } catch (error) {
        console.error("Error fetching way bills:", error);
        window.electronAPI.showAlert1("Failed to fetch way bills. Please try again later.");
    }
}