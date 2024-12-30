document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

// Function to fetch data from the server
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        return null;
    }
}

// Function to initialize the weekly chart
async function initWeeklyChart() {
    const data = await fetchData('/api/weekly-data');
    if (!data) return;

    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Profit/Loss (₹)',
                data: data.values,
                backgroundColor: data.values.map(value => value >= 0 ? '#4caf50' : '#f44336')
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
}

// Function to initialize the monthly chart
async function initMonthlyChart() {
    const data = await fetchData('/api/monthly-data');
    if (!data) return;

    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Expenditure (₹)',
                data: data.values,
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
}

// Function to initialize the yearly chart
async function initYearlyChart() {
    const data = await fetchData('/api/yearly-data');
    if (!data) return;

    const yearlyCtx = document.getElementById('yearlyChart').getContext('2d');
    new Chart(yearlyCtx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Yearly Trends',
                data: data.values,
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
}

// Initialize all charts
document.addEventListener('DOMContentLoaded', () => {
    initWeeklyChart();
    initMonthlyChart();
    initYearlyChart();
});