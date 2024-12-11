document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

// Data for weekly chart
const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
new Chart(weeklyCtx, {
    type: 'bar',
    data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
            label: 'Profit/Loss (₹)',
            data: [5000, -2000, 3000, 1000],
            backgroundColor: ['#4caf50', '#f44336', '#4caf50', '#4caf50']
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true },
            tooltip: { enabled: true }
        }
    }
});

// Data for monthly chart
const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
new Chart(monthlyCtx, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Expenditure (₹)',
            data: [10000, 15000, 12000, 17000, 13000, 14000, 16000, 18000, 15000, 20000, 17000, 19000],
            borderColor: '#3e95cd',
            fill: false
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true },
            tooltip: { enabled: true }
        }
    }
});

// Data for yearly trends
const yearlyCtx = document.getElementById('yearlyChart').getContext('2d');
new Chart(yearlyCtx, {
    type: 'pie',
    data: {
        labels: ['Profit', 'Loss', 'Expenditure'],
        datasets: [{
            label: 'Yearly Trends',
            data: [500000, 200000, 800000],
            backgroundColor: ['#4caf50', '#f44336', '#2196f3']
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true },
            tooltip: { enabled: true }
        }
    }
});