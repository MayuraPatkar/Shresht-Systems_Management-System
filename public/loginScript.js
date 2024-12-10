
document.getElementById('login2').addEventListener('click', () => {
    // Get user inputs
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Prepare data to send
    const data = {
        username: username,
        password: password,
    };

    // Send POST request to the server
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (response.ok) {
            return response.json(); // Parse the JSON response
        } else {
            throw new Error('Failed to login');
        }
    })
    .then(data => {
        window.location = '/dashboard'; // Handle success response
    })
    .catch(error => {
        console.error('Error:', error); // Handle error
    });
});
