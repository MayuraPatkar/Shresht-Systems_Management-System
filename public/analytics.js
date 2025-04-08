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
    };

    const navItems = {
        overview: document.getElementById("overview-btn"),
        projects: document.getElementById("projects-btn"),
        profit_loss: document.getElementById("profit-loss-btn"),
    };

    Object.keys(navItems).forEach(key => {
        navItems[key].addEventListener("click", () => {
            // Hide all sections
            Object.values(sections).forEach(sec => {
                if (sec) sec.style.display = "none";
            });

            // Show the selected section
            if (sections[key]) {
                sections[key].style.display = "flex";
            }

            // Toggle active class
            Object.values(navItems).forEach(btn => btn.classList.remove("active"));
            navItems[key].classList.add("active");
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

    function groupByTime(projects, filter) {
        const grouped = {};
        projects.forEach((project) => {
            const date = new Date(project.createdAt || project.date);
            let key;
            if (filter === "week") {
                const year = date.getFullYear();
                const week = Math.ceil(
                    ((date - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
                );
                key = `${year}-W${week}`;
            } else if (filter === "year") {
                key = date.getFullYear();
            } else {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
            }
            grouped[key] = (grouped[key] || 0) + 1;
        });
        return grouped;
    }

    const ctx = document.getElementById("projectsPlot").getContext("2d");
    let chartInstance;

    async function renderChart(filter) {
        const projects = await loadProjects();
        if (projects.length === 0) return;

        const dataMap = groupByTime(projects, filter);
        const labels = Object.keys(dataMap).sort();
        const values = labels.map((label) => dataMap[label]);

        const barColors = labels.map(() =>
            `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
        );

        if (chartInstance) chartInstance.destroy(); // Destroy old chart if exists

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: `Projects per ${filter}`,
                    data: values,
                    backgroundColor: barColors,
                    borderColor: barColors.map(color => color.replace("hsl", "rgba").replace(")", ", 0.5)")),
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: `Projects per ${filter}` }
                },
                scales: {
                    x: { title: { display: true, text: filter.charAt(0).toUpperCase() + filter.slice(1) } },
                    y: { beginAtZero: true, title: { display: true, text: "Number of Projects" } }
                }
            }
        });
    }
    
    let currentFilter = "month";
    await renderChart(currentFilter);
    
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
    
            currentFilter = btn.getAttribute("data-filter");
            await renderChart(currentFilter);
        });
    });
    
}
drawChart();