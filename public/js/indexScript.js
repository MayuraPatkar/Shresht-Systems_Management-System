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

    // Send POST request to the server
    fetch('http://localhost:3000/admin/login', {
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
