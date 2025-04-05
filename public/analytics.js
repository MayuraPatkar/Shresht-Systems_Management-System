document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

document.addEventListener("DOMContentLoaded", () => {
    fetch('/analytics/overview') // change to your real endpoint
        .then(res => res.json())
        .then(data => {
            animateCounter("project-count", data.totalProjects);
            animateCounter("quotation-count", data.totalQuotations);
            animateCounter("earned-count", data.totalEarned, true);
            animateCounter("unpaid-count", data.totalUnpaid);
        })
        .catch(err => {
            console.error("Error fetching analytics:", err);
        });
});

// Animate with count-up effect
function animateCounter(id, end, isCurrency = false, duration = 3000, delay = 500) {
    const element = document.getElementById(id);
    let start = 0;

    // Ensure smooth speed across different values
    const steps = Math.floor(duration / 16);
    const increment = Math.ceil(end / steps);

    setTimeout(() => {
        const interval = setInterval(() => {
            start += increment;
            if (start >= end) {
                start = end;
                clearInterval(interval);
            }
            element.textContent = isCurrency ? `₹${start.toLocaleString()}` : start;
        }, 16);
    }, delay); // Delay before the animation starts
}



async function drawChart() {
    // Load projects from the server
    async function loadProjects() {
        try {
            const response = await fetch(`/invoice/get-all`); 
            if (!response.ok) { 
                throw new Error("Failed to fetch projects");
            }

            const data = await response.json();
            return data.invoices; // Return the projects array
        } catch (error) {
            console.error("Error loading projects:", error);
            document.getElementById("projectsPlot").innerHTML = 
                "<p>Failed to load projects. Please try again later.</p>";
            return [];
        }
    }

    const projects = await loadProjects();
    if (projects.length === 0) return;

    // Process data: Count projects per month
    const monthCounts = {};
    projects.forEach(project => {
        const date = new Date(project.createdAt);
        const month = date.toLocaleString("default", { year: "numeric", month: "short" }); // "Jan 2025"
        
        if (!monthCounts[month]) {
            monthCounts[month] = 0;
        }
        monthCounts[month]++;
    });

    // Convert data to Google Charts format
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn("string", "Month");
    dataTable.addColumn("number", "Projects");

    // Sort months in chronological order
    const sortedMonths = Object.keys(monthCounts).sort(
        (a, b) => new Date(a) - new Date(b)
    );

    sortedMonths.forEach(month => {
        dataTable.addRow([month, monthCounts[month]]);
    });

    // Chart options
    const options = {
        title: "Projects Per Month",
        curveType: "function",
        legend: { position: "bottom" },
        hAxis: { title: "Month" },
        vAxis: { title: "Number of Projects", minValue: 0 }
    };

    // Draw Chart
    const chart = new google.visualization.LineChart(
        document.getElementById("projectsPlot")
    );
    chart.draw(dataTable, options);
}

google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(drawChart);



