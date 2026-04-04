// ================= CART MANAGEMENT =================

let cart = [];

function addToCart(button) {
    const card = button.closest('.vendor-card');
    if (!card) return;

    const vendorName = card.querySelector('h3').textContent;
    const vendorPrice = card.querySelector('.price').textContent;

    const existingItem = cart.find(item => item.name === vendorName);

    if (!existingItem) {
        cart.push({
            name: vendorName,
            price: vendorPrice
        });

        button.textContent = '✓ Added';
        button.disabled = true;

        showNotification(`${vendorName} added!`);
    } else {
        cart = cart.filter(item => item.name !== vendorName);

        button.textContent = '+ Add';
        button.disabled = false;

        showNotification(`${vendorName} removed!`);
    }

    updateCart();
}

function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    if (!cartItemsDiv) return;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>No vendors added</p>';
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        html += `
            <div>
                ${item.name} - ${item.price}
                <button onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
    });

    cartItemsDiv.innerHTML = html;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// ================= NOTIFICATION =================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 999;
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
}

// ================= CALENDAR =================

let currentDate = new Date();

function renderCalendar() {
    const monthYear = document.getElementById("monthYear");
    const calendarDates = document.getElementById("calendarDates");

    if (!monthYear || !calendarDates) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = currentDate.toLocaleString("default", {
        month: "long",
        year: "numeric"
    });

    calendarDates.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
        calendarDates.innerHTML += "<div></div>";
    }

    for (let i = 1; i <= lastDate; i++) {
        const dateDiv = document.createElement("div");
        dateDiv.textContent = i;

        dateDiv.addEventListener("click", () => {
            alert(`Selected: ${i}/${month + 1}/${year}`);
        });

        calendarDates.appendChild(dateDiv);
    }
}

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// ================= INIT =================

document.addEventListener("DOMContentLoaded", () => {

    renderCalendar();

    // ================= ACCEPT / REJECT =================

    document.querySelectorAll(".vendor-card").forEach(card => {

        const acceptBtn = card.querySelector(".accept-btn");
        const rejectBtn = card.querySelector(".reject-btn");

        if (acceptBtn) {
            acceptBtn.addEventListener("click", () => {
                acceptBtn.textContent = "Accepted";
                acceptBtn.style.backgroundColor = "green";

                if (rejectBtn) rejectBtn.style.display = "none";
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener("click", () => {
                rejectBtn.textContent = "Rejected";
                rejectBtn.style.backgroundColor = "red";

                if (acceptBtn) acceptBtn.style.display = "none";
            });
        }

    });

});