// --- CHANGELOG MODAL FUNCTIONALITY ---

/**
 * Gets the icon for a change type
 */
function getChangeTypeIcon(type) {
    const icons = {
        'feature': '<i class="fas fa-star text-green-600"></i>',
        'improvement': '<i class="fas fa-arrow-up text-blue-600"></i>',
        'bugfix': '<i class="fas fa-bug text-red-600"></i>',
        'security': '<i class="fas fa-shield-alt text-purple-600"></i>',
        'breaking': '<i class="fas fa-exclamation-triangle text-orange-600"></i>'
    };
    return icons[type] || '<i class="fas fa-circle text-gray-400"></i>';
}

/**
 * Formats a date string
 */
function formatChangelogDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * Shows the changelog modal with version history
 */
async function showChangelogModal() {
    const modal = document.getElementById('changelog-modal');
    const content = document.getElementById('changelog-modal-content');
    const versionText = document.getElementById('changelog-version-text');

    if (!modal || !content) return;

    try {
        const result = await window.electronAPI.getChangelog();

        if (!result.success || !result.changelog || !result.changelog.versions || result.changelog.versions.length === 0) {
            content.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-info-circle text-gray-300 text-4xl mb-3"></i>
                    <p class="text-gray-500">No changelog available</p>
                </div>
            `;
            modal.classList.remove('hidden');
            return;
        }

        const versions = result.changelog.versions;
        const latestVersion = versions[0];

        // Update version text
        if (versionText) {
            versionText.textContent = `Version ${latestVersion.version} • ${formatChangelogDate(latestVersion.date)}`;
        }

        // Build clean list layout without cards
        let html = '<div class="space-y-8">';

        versions.forEach((version, index) => {
            const isLatest = index === 0;
            
            html += `
                <div class="${isLatest ? '' : 'pt-8 border-t border-gray-200'}">
                    <div class="flex items-center gap-3 mb-4">
                        ${isLatest ? '<span class="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">LATEST</span>' : ''}
                        <h3 class="text-xl font-bold text-gray-800">v${version.version}</h3>
                        <span class="text-gray-400">•</span>
                        <span class="text-gray-600 font-medium">${version.title || 'Release'}</span>
                        <span class="text-gray-400 text-sm ml-auto">${formatChangelogDate(version.date)}</span>
                    </div>
                    <ul class="space-y-3 pl-1">
            `;

            version.changes.forEach(change => {
                const typeConfig = {
                    'feature': { bg: 'bg-green-100', text: 'text-green-700', icon: 'fa-plus', label: 'New' },
                    'improvement': { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-arrow-up', label: 'Improved' },
                    'bugfix': { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-bug', label: 'Fixed' },
                    'security': { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-shield-alt', label: 'Security' },
                    'breaking': { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-exclamation', label: 'Breaking' }
                };
                const config = typeConfig[change.type] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'fa-circle', label: 'Update' };

                html += `
                    <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-20 px-2 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded text-center">
                            <i class="fas ${config.icon} mr-1"></i>${config.label}
                        </span>
                        <span class="text-gray-700 leading-relaxed">${change.description}</span>
                    </li>
                `;
            });

            html += `
                    </ul>
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;
        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Failed to show changelog modal:', error);
        content.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-3"></i>
                <p class="text-gray-700 font-medium">Error loading changelog</p>
                <p class="text-gray-500 text-sm mt-1">${error.message}</p>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

/**
 * Hides the changelog modal and marks it as seen
 */
async function hideChangelogModal() {
    const modal = document.getElementById('changelog-modal');
    const newBadge = document.getElementById('new-badge');
    
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('fade-in');
    }
    
    // Hide the new badge
    if (newBadge) {
        newBadge.classList.add('hidden');
    }

    try {
        await window.electronAPI.markChangelogSeen();
    } catch (error) {
        console.error('Failed to mark changelog as seen:', error);
    }
}

/**
 * Check if changelog should be shown on app start
 */
async function checkAndShowChangelog() {
    try {
        const result = await window.electronAPI.shouldShowChangelog();

        if (result.success && result.showChangelog) {
            showChangelogModal();
        }
    } catch (error) {
        console.error('Failed to check changelog status:', error);
    }
}

// Initialize changelog modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    // What's New button
    const whatsNewBtn = document.getElementById('whats-new-btn');
    const newBadge = document.getElementById('new-badge');
    
    whatsNewBtn?.addEventListener('click', () => {
        showChangelogModal();
        // Hide the new badge after clicking
        if (newBadge) {
            newBadge.classList.add('hidden');
        }
    });

    // Close button
    document.getElementById('close-changelog-modal')?.addEventListener('click', hideChangelogModal);

    // Dismiss button
    document.getElementById('dismiss-changelog')?.addEventListener('click', hideChangelogModal);

    // Check if we should show changelog on startup and show badge
    checkAndShowChangelog().then(() => {
        // Check if there's a new version to show the badge
        window.electronAPI.shouldShowChangelog().then(result => {
            if (result.success && result.showChangelog && newBadge) {
                newBadge.classList.remove('hidden');
            }
        }).catch(err => console.error('Failed to check changelog status:', err));
    });
});

// --- LOGIN FUNCTIONALITY ---

// Show login form
document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    // window.location = '/dashboard';
    // Focus on username field
    setTimeout(() => document.getElementById('username').focus(), 100);
});

// Back button - return to welcome screen
document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    // Clear form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

// Handle login form submission
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    performLogin();
});

// Login button click
document.getElementById('login-btn').addEventListener('click', (e) => {
    e.preventDefault();
    performLogin();
});

// Perform login function
function performLogin() {
    // Get user inputs
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!username || !password) {
        window.electronAPI.showAlert1("Please enter both username and password");
        return;
    }

    // Disable button and show loading state
    const loginBtn = document.getElementById('login-btn');
    const originalContent = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

    // Prepare data to send
    const data = { username, password };

    // Send POST request to the server (using relative URL since frontend is served by same Express server)
    fetch('/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(result => {
            if (result && result.success) {
                // Save user role and username in sessionStorage
                sessionStorage.setItem('userRole', result.role);
                sessionStorage.setItem('username', result.username);

                // Show success state
                loginBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Success! Redirecting...';
                loginBtn.classList.remove('gradient-bg');
                loginBtn.classList.add('bg-green-600');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location = '/dashboard';
                }, 500);
            } else {
                // Show error
                window.electronAPI.showAlert1("Invalid username or password");

                // Reset button
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalContent;
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            window.electronAPI.showAlert1("Connection error. Please try again.");

            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalContent;
        });
}

// Enter key handler for login
document.addEventListener("keydown", function (event) {
    // Check if the changelog modal is visible first
    const changelogModal = document.getElementById('changelog-modal');
    if (changelogModal && !changelogModal.classList.contains('hidden')) {
        if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            hideChangelogModal();
        }
        return; // Stop further execution if changelog modal is open
    }

    // Check if the auth container is visible
    const authContainer = document.getElementById('auth-container');
    if (authContainer && !authContainer.classList.contains('hidden')) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById('show-login').click();
        }
        return; // Stop further execution if we are on the auth screen
    }

    // Check if the login container is visible
    const loginContainer = document.getElementById('login-container');
    if (loginContainer && !loginContainer.classList.contains('hidden')) {
        if (event.key === "Enter") {
            event.preventDefault();
            performLogin();
        } else if (event.key === "Escape") {
            event.preventDefault();
            document.getElementById('back-btn').click();
        }
    }
});
