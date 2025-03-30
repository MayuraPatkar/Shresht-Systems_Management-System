document.getElementById('show-login').addEventListener('click', () => {
    document.querySelector('.auth-container').style.display = "none";
    document.querySelector('.login-container').style.display = "flex";
});

document.getElementById('login-btn').addEventListener('click', () => {
    // Get user inputs
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Prepare data to send
    const data = { username, password };

    // Send POST request to the server
    fetch('http://localhost:3000/login/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => {
            if (response.ok) {
                window.location = '/dashboard';
            } else {
                document.getElementById('error-msg').style.display = "block";
                document.getElementById('error-msg').innerText = "Invalid username or password";
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});


function login() {
    document.getElementById('login-btn').click();
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        login();
    }
});

