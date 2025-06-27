document.addEventListener("DOMContentLoaded", () => {
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