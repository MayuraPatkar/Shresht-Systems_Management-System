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
let lockoutCountdownInterval = null;

function performLogin() {
    // Get user inputs
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!username || !password) {
        showLoginMessage('Please enter both username and password', 'error');
        return;
    }

    // Clear any existing messages
    hideLoginMessage();

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
                // Save user role, username, and session info in sessionStorage
                sessionStorage.setItem('userRole', result.role);
                sessionStorage.setItem('username', result.username);
                sessionStorage.setItem('sessionTimeout', result.sessionTimeout || 30);
                sessionStorage.setItem('loginTime', Date.now());

                // Start session timeout monitor
                startSessionMonitor();

                // Show success state
                loginBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Success! Redirecting...';
                loginBtn.classList.remove('gradient-bg');
                loginBtn.classList.add('bg-green-600');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location = '/dashboard';
                }, 500);
            } else {
                // Handle different error types
                if (result.locked) {
                    // Account is locked - show countdown
                    const remainingMinutes = result.remainingTime || 15;
                    startLockoutCountdown(remainingMinutes, loginBtn, originalContent);
                } else if (result.attemptsRemaining !== undefined) {
                    // Show remaining attempts warning
                    showLoginMessage(
                        result.message || 'Invalid credentials',
                        'warning',
                        `${result.attemptsRemaining} attempt(s) remaining before account lockout`
                    );
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = originalContent;
                } else {
                    // Generic error
                    showLoginMessage(result.message || 'Invalid username or password', 'error');
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = originalContent;
                }
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showLoginMessage('Connection error. Please try again.', 'error');

            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalContent;
        });
}

// Show login message on card
function showLoginMessage(message, type = 'info', subtitle = null) {
    const messageContainer = document.getElementById('login-message');
    const messageIcon = document.getElementById('login-message-icon');
    const messageText = document.getElementById('login-message-text');
    const messageSubtitle = document.getElementById('login-message-subtitle');

    // Set message content
    messageText.textContent = message;
    
    if (subtitle) {
        messageSubtitle.textContent = subtitle;
        messageSubtitle.classList.remove('hidden');
    } else {
        messageSubtitle.classList.add('hidden');
    }

    // Remove all type classes
    messageContainer.classList.remove('bg-red-50', 'border-red-200', 'text-red-700');
    messageContainer.classList.remove('bg-yellow-50', 'border-yellow-200', 'text-yellow-700');
    messageContainer.classList.remove('bg-blue-50', 'border-blue-200', 'text-blue-700');
    messageContainer.classList.remove('bg-green-50', 'border-green-200', 'text-green-700');
    messageIcon.classList.remove('text-red-500', 'text-yellow-500', 'text-blue-500', 'text-green-500');
    messageIcon.classList.remove('fa-exclamation-circle', 'fa-exclamation-triangle', 'fa-info-circle', 'fa-check-circle', 'fa-clock');

    // Apply type-specific styles
    if (type === 'error') {
        messageContainer.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
        messageIcon.classList.add('fa-exclamation-circle', 'text-red-500');
    } else if (type === 'warning') {
        messageContainer.classList.add('bg-yellow-50', 'border-yellow-200', 'text-yellow-700');
        messageIcon.classList.add('fa-exclamation-triangle', 'text-yellow-500');
    } else if (type === 'success') {
        messageContainer.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
        messageIcon.classList.add('fa-check-circle', 'text-green-500');
    } else if (type === 'locked') {
        messageContainer.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
        messageIcon.classList.add('fa-clock', 'text-red-500');
    } else {
        messageContainer.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700');
        messageIcon.classList.add('fa-info-circle', 'text-blue-500');
    }

    // Show the message
    messageContainer.classList.remove('hidden');
}

// Hide login message
function hideLoginMessage() {
    const messageContainer = document.getElementById('login-message');
    messageContainer.classList.add('hidden');
}

// Start lockout countdown
function startLockoutCountdown(minutes, loginBtn, originalBtnContent) {
    // Clear any existing countdown
    if (lockoutCountdownInterval) {
        clearInterval(lockoutCountdownInterval);
    }

    let remainingSeconds = minutes * 60;
    
    const updateCountdown = () => {
        if (remainingSeconds <= 0) {
            clearInterval(lockoutCountdownInterval);
            lockoutCountdownInterval = null;
            hideLoginMessage();
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnContent;
            showLoginMessage('Account unlocked. You may try logging in again.', 'success');
            setTimeout(hideLoginMessage, 5000);
            return;
        }

        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;

        showLoginMessage(
            'Account Locked',
            'locked',
            `Too many failed login attempts. Please wait ${timeString} before trying again.`
        );

        remainingSeconds--;
    };

    // Update immediately and then every second
    updateCountdown();
    lockoutCountdownInterval = setInterval(updateCountdown, 1000);

    // Disable login button
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-lock mr-2"></i>Account Locked';
}

// Session timeout monitor
let sessionTimeoutId = null;
let activityCheckId = null;

function startSessionMonitor() {
    const sessionTimeout = parseInt(sessionStorage.getItem('sessionTimeout') || '30');
    const loginTime = parseInt(sessionStorage.getItem('loginTime'));
    
    // Clear any existing timers
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (activityCheckId) clearInterval(activityCheckId);
    
    // Set timeout for session expiration
    const timeoutMs = sessionTimeout * 60 * 1000;
    sessionTimeoutId = setTimeout(() => {
        handleSessionTimeout();
    }, timeoutMs);
    
    // Check every minute if session should expire
    activityCheckId = setInterval(() => {
        const elapsed = Date.now() - loginTime;
        if (elapsed >= timeoutMs) {
            handleSessionTimeout();
        }
    }, 60000); // Check every minute
}

function handleSessionTimeout() {
    // Clear timers
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (activityCheckId) clearInterval(activityCheckId);
    
    // Clear session
    sessionStorage.clear();
    
    // Show alert and redirect to login
    window.electronAPI.showAlert1("Session expired due to inactivity. Please login again.");
    window.location = '/';
}

// Reset session timer on user activity
let lastActivity = Date.now();
const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

activityEvents.forEach(event => {
    document.addEventListener(event, () => {
        const now = Date.now();
        // Only reset if more than 1 minute has passed since last activity
        if (now - lastActivity > 60000) {
            lastActivity = now;
            sessionStorage.setItem('loginTime', now);
        }
    }, true);
});

// Start session monitor on page load if user is logged in
if (sessionStorage.getItem('userRole') && sessionStorage.getItem('loginTime')) {
    startSessionMonitor();
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
