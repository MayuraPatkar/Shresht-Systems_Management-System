document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate overview data
    fetch('/analytics/overview')
        .then(res => res.json())
        .then(data => {
            animateCounter("project-count", data.totalProjects);
            animateCounter("quotation-count", data.totalQuotations);
            animateCounter("earned-count", data.totalEarned, true);
            animateCounter("unpaid-count", data.totalUnpaid);
            animateCounter("expenditure-count", data.totalExpenditure, true);
            animateCounter("remaining-services-count", data.remainingServices);
        })
        .catch(err => {
            console.error("Error fetching analytics:", err);
        });
});

// ---------------------- Animated Counter Function ----------------------
function animateCounter(
  id,
  end,
  isCurrency = false,
  duration = 1000,
  delay = 10
) {
  const el = document.getElementById(id);
  if (end === 0) {
    el.textContent = isCurrency ? `₹${formatIndian(0)}` : formatIndian(0);
    return;
  }

  setTimeout(() => {
    const t0 = performance.now();
    const run = now => {
      const p = Math.min((now - t0) / duration, 1);   // 0 → 1
      const value = end * p;

      el.textContent = isCurrency
        ? `₹${formatIndian(value, 2)}`                // ₹ 12,34,560.75
        : formatIndian(Math.floor(value));            // 12,34,561

      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, delay);
}



// Add this to dashboard.js
function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, dateOptions);
    document.getElementById('current-time').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateDateTime, 1000);
updateDateTime();