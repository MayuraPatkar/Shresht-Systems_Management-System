// Navigate to the dashboard when the logo is clicked
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

// Show a modal by ID
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.getElementById('backdrop').style.display = 'block';
}

// Hide all modals
function hideModal() {
    const modals = ['addEmp']; // Add more modal IDs here if needed
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    });
    document.getElementById('backdrop').style.display = 'none';
}

// Open the "Add Employee" modal and reset input fields
function openAddEmployeeModal() {
    document.getElementById('Emp_name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('salary').value = '';
    showModal('addEmp');
}

// Add a new employee
async function addEmployee() {
    try {
        const name = document.getElementById('Emp_name').value.trim();
        const address = document.getElementById('address').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const salary = parseInt(document.getElementById('salary').value.trim(), 10);

        // Validate input fields
        if (!name || !phone || !email || isNaN(salary)) {
            window.electronAPI.showAlert1('Please fill all fields correctly.');
            return;
        }

        // Send a POST request to add the employee
        const response = await fetch('/employee/addEmp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, address, phone, email, salary }),
        });

        if (!response.ok) throw new Error('Failed to add employee');

        // Refresh employee data and close the modal
        await fetchEmployeeData();
        hideModal();
    } catch (error) {
        console.error('Error adding employee:', error);
        window.electronAPI.showAlert1('Failed to add employee. Please try again.');
    }
}

// Fetch employee data from the server
async function fetchEmployeeData() {
    try {
        const response = await fetch('/employee/getEmployees');
        if (!response.ok) throw new Error('Failed to fetch employee data');

        const employeeData = await response.json();
        renderEmployeeTable(employeeData);
        renderProfiles(employeeData);
    } catch (error) {
        console.error('Error fetching employee data:', error);
        window.electronAPI.showAlert1('Error fetching employee data. Please try again.');
    }
}

// Function to submit attendance data
async function attendance(emp_id) {
    try {
        const present = document.querySelector(`#present-${emp_id}`).checked;
        const start_time = document.querySelector(`#start_time-${emp_id}`).value;
        const end_time = document.querySelector(`#end_time-${emp_id}`).value;

        if (!start_time || !end_time) {
            window.electronAPI.showAlert1('Please enter start and end time.');
            return;
        }

        const response = await fetch('/employee/markAttendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emp_id, present, start_time, end_time }),
        });

        if (!response.ok) throw new Error('Failed to submit attendance');

        window.electronAPI.showAlert1('Attendance submitted successfully');
    } catch (error) {
        console.error('Error submitting attendance:', error);
        window.electronAPI.showAlert1('Error submitting attendance. Please try again.');
    }
}

// rendering to include unique IDs for elements
function renderEmployeeTable(data) {
    const tableBody = document.getElementById('emp-table-body');
    tableBody.innerHTML = '';

    data.employees.forEach(employee => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${employee.emp_id}</td>
            <td>${employee.name}</td>
            <td><input type="checkbox" id="present-${employee.emp_id}"></td>
            <td><input type="time" id="start_time-${employee.emp_id}"></td>
            <td><input type="time" id="end_time-${employee.emp_id}"></td>
            <td><button onclick="attendance(${employee.emp_id})" class="btn">Save</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// rendering to include unique IDs for elements
function renderProfiles(data) {
    const profileBody = document.getElementById('profiles');
    profileBody.innerHTML = '';

    data.employees.forEach(employee => {
        const profile = document.createElement('div');

        profile.innerHTML = `
        <div class="info1">
        <div class="icon"><img src="../assets/employee.png" alt="icon"></div>
            <h2>${employee.name}</h2>
            <h3>${employee.emp_id}</t3>
        </div>
        <div class="info2">
        <h3>${employee.phone}</h3>
        <h3>${employee.payment_status}</h3>
        </div>
        `;
        profile.classList = 'profile';
        profileBody.classList = 'profile-list';
        profileBody.appendChild(profile);
    });
}


// Initial fetch of employee data
fetchEmployeeData();

// Event listener for backdrop click to close modals
document.getElementById('backdrop').addEventListener('click', hideModal);