document.getElementById('quotation').addEventListener('click', () => {
    window.location = '/quotation';
})

document.getElementById('postOrder').addEventListener('click', () => {
    window.location = '/purchaseorder';
})

document.getElementById('wayBill').addEventListener('click', () => {
    window.location = '/wayBill';
})

document.getElementById('invoice').addEventListener('click', () => {
    window.location = '/invoice';
})

document.getElementById('service').addEventListener('click', () => {
    window.location = '/service';
})

document.getElementById('stock').addEventListener('click', () => {
    window.location = '/stock';
})

document.getElementById('employees').addEventListener('click', () => {
    window.location = '/employee';
})

document.getElementById('analytics').addEventListener('click', () => {
    window.location = '/analytics';
})

document.getElementById('management').addEventListener('click', () => {
    window.location = '/management';
})

document.addEventListener("DOMContentLoaded", () => {
    const notificationIcon = document.getElementById("notification");
    const notificationContainer = document.getElementById("notification_container");
    const notificationBadge = document.getElementById("notification-badge");

    // get service notifications fron server
    let notifications = [];
    fetch("/service/notifications")
        .then(response => response.json())
        .then(data => {
            notifications = data.notifications;
            updateNotificationBadge();
        });


    // Function to display notifications
    function displayNotifications() {
        notificationContainer.innerHTML = ""; // Clear existing notifications
        notifications.forEach(notification => {
            const notificationDiv = document.createElement("div");
            notificationDiv.className = "notification-item";
            notificationDiv.innerText = notification.message;
            notificationContainer.appendChild(notificationDiv);
        });
    }

    // Function to update the notification badge
    function updateNotificationBadge() {
        const notificationCount = notifications.length;
        if (notificationCount > 0) {
            notificationBadge.innerText = notificationCount;
            notificationBadge.style.display = "block";
        } else {
            notificationBadge.style.display = "none";
        }
    }

    // Toggle notification display
    notificationIcon.addEventListener("click", () => {
        if (notificationContainer.style.display === "block") {
            notificationContainer.style.display = "none";
        } else {
            displayNotifications();
            notificationContainer.style.display = "block";
        }
    });

    // Hide notifications when clicking outside
    document.addEventListener("click", (event) => {
        if (!notificationIcon.contains(event.target) && !notificationContainer.contains(event.target)) {
            notificationContainer.style.display = "none";
        }
    });

    // Initial update of the notification badge
    updateNotificationBadge();
});