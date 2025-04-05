// ---------------------- Event Listener for Logo ----------------------
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

// ---------------------- Section Toggle Logic ----------------------
document.addEventListener("DOMContentLoaded", () => {
    const sections = {
        overview: document.getElementById("overview"),
        projects: document.getElementById("projects"),
        profit_loss: document.getElementById("profit_loss"),
        // quotation: document.getElementById("Quotation")
    };

    const navItems = {
        overview: document.getElementById("overview-btn"),
        projects: document.getElementById("projects-btn"),
        profit_loss: document.getElementById("profit-loss-btn"),
        // quotation: document.getElementById("quotation-btn")
    };

    Object.keys(navItems).forEach(key => {
        navItems[key].addEventListener("click", () => {
            Object.values(sections).forEach(sec => {
                if (sec) sec.style.display = "none";
            });

            if (sections[key]) {
                sections[key].style.display = "flex";
            }
        });
    });

    // Fetch and populate overview data
    fetch('/analytics/overview')
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

// ---------------------- Animated Counter Function ----------------------
function animateCounter(id, end, isCurrency = false, duration = 3000, delay = 500) {
    const element = document.getElementById(id);
    let start = 0;
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
    }, delay);
}

// ---------------------- Draw Projects Chart ----------------------
async function drawChart() {
    async function loadProjects() {
        try {
            const response = await fetch(`/invoice/get-all`);
            if (!response.ok) throw new Error("Failed to fetch projects");
            const data = await response.json();
            return data.invoices;
        } catch (error) {
            console.error("Error loading projects:", error);
            document.getElementById("projectsPlot").innerHTML =
                "<p>Failed to load projects. Please try again later.</p>";
            return [];
        }
    }

    const projects = await loadProjects();
    if (projects.length === 0) return;

    const monthCounts = {};
    projects.forEach(project => {
        const date = new Date(project.createdAt);
        const month = date.toLocaleString("default", { year: "numeric", month: "short" });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn("string", "Month");
    dataTable.addColumn("number", "Projects");

    const sortedMonths = Object.keys(monthCounts).sort((a, b) => new Date(`1 ${a}`) - new Date(`1 ${b}`));
    sortedMonths.forEach(month => {
        dataTable.addRow([month, monthCounts[month]]);
    });

    const options = {
        title: "Projects Per Month",
        curveType: "function",
        legend: { position: "bottom" },
        hAxis: { title: "Month" },
        vAxis: { title: "Number of Projects", minValue: 0 }
    };

    const chart = new google.visualization.LineChart(document.getElementById("projectsPlot"));
    chart.draw(dataTable, options);
}

// ---------------------- Google Charts Loader ----------------------
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(drawChart);