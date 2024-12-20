document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

document.addEventListener("DOMContentLoaded", () => {
    const projectListDiv = document.querySelector(".project_list .projects");
    const paidButton = document.querySelector(".filter button:nth-child(1)");
    const unpaidButton = document.querySelector(".filter button:nth-child(2)");

    // Function to load recent projects from the server
    async function loadRecentProjects(filter = "") {
        try {
            // Fetch the recent projects from the Express server with the filter
            const response = await fetch(`/project/recent-projects?filter=${filter}`);
            if (!response.ok) {
                throw new Error("Failed to fetch projects");
            }

            const projects = await response.json();

            // Clear the current project list
            projectListDiv.innerHTML = "";

            // Populate the project list
            projects.projects.forEach(project => {
                const projectDiv = document.createElement("div");
                projectDiv.className = "project-item";
                projectDiv.style.padding = "1rem";
                projectDiv.style.marginBottom = "1rem";
                projectDiv.style.border = "1px solid #ddd";
                projectDiv.style.borderRadius = "10px";
                projectDiv.style.cursor = "pointer";
                projectDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
                projectDiv.style.transition = "background-color 0.3s";

                // Add hover effect
                projectDiv.addEventListener("mouseenter", () => {
                    projectDiv.style.backgroundColor = "#f0f8ff";
                });
                projectDiv.addEventListener("mouseleave", () => {
                    projectDiv.style.backgroundColor = "#fff";
                });

                // Project content
                projectDiv.innerHTML = `
                    <h4>${project.project_name}</h4>
                    <p>Invoice #: ${project.invoice_number}</p>
                    <p>Status: ${project.status}</p>
                `;

                // Add click event to redirect to the details page
                projectDiv.addEventListener("click", () => {
                    window.location.href = `/project/${project.invoice_number}`;
                });

                projectListDiv.appendChild(projectDiv);
            });
        } catch (error) {
            console.error("Error loading projects:", error);
            projectListDiv.innerHTML = "<p>Failed to load projects. Please try again later.</p>";
        }
    }

    // Event listeners for the filter buttons
    paidButton.addEventListener("click", () => {
        loadRecentProjects("paid");
    });

    unpaidButton.addEventListener("click", () => {
        loadRecentProjects("unpaid");
    });

    // Call the function to load recent projects without any filter initially
    loadRecentProjects();
});