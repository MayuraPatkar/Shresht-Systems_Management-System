document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

document.getElementById('addEmployee').addEventListener('click', () => {
    addEmployee();
})

        // Example employee data
        const employees = [
            { id: 1, name: "John Doe", attendance: "20/30", salary: 30000, paymentStatus: "Paid" },
            { id: 2, name: "Jane Smith", attendance: "18/30", salary: 28000, paymentStatus: "Unpaid" },
            { id: 3, name: "Alice Johnson", attendance: "25/30", salary: 32000, paymentStatus: "Paid" }
        ];

        const employeeTableBody = document.getElementById("employee-table").querySelector("tbody");

        // Function to render the employee table
        function renderTable() {
            employeeTableBody.innerHTML = "";
            employees.forEach(employee => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${employee.id}</td>
                    <td>${employee.name}</td>
                    <td>${employee.attendance}</td>
                    <td>₹${employee.salary}</td>
                    <td>${employee.paymentStatus}</td>
                `;
                employeeTableBody.appendChild(row);
            });
        }

        // Function to add a new employee
        function addEmployee() {
            const newId = employees.length + 1;
            employees.push({
                id: newId,
                name: `Employee ${newId}`,
                attendance: "0/30",
                salary: 25000,
                paymentStatus: "Unpaid"
            });
            renderTable();
        }

        // Initial rendering
        renderTable();