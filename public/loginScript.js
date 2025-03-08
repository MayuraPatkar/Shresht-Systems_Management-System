
document.getElementById('login2').addEventListener('click', () => {
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
                document.getElementById('error').style.display = "block";
                document.getElementById('error').innerText = "Invalid username or password";
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});


function login() {
    document.getElementById('login2').click();
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
      login();
  }
});

