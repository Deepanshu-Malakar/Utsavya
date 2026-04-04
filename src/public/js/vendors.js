// Cart management for booking items
let cart = [];
let selectedBookingId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if coming from events page with selected booking
    selectedBookingId = sessionStorage.getItem('selectedBookingId');
    if (selectedBookingId) {
        // Clear the stored booking ID after use
        sessionStorage.removeItem('selectedBookingId');
        loadBookingDetails();
    }

    // Load vendors
    loadVendors();
});

async function loadBookingDetails() {
    if (!selectedBookingId) return;

    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`/bookings/${selectedBookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const booking = await response.json();
            updateHeroWithBooking(booking);
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
    }
}

function updateHeroWithBooking(booking) {
    const heroContent = document.querySelector('.hero-content h1');
    if (heroContent) {
        heroContent.innerHTML = `Find Vendors for <span>${booking.title}</span>`;
    }

    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
        // Add the current booking as the selected option
        const eventDate = new Date(booking.event_start).toLocaleDateString('en-IN');
        eventSelect.innerHTML = `<option value="${booking.id}" selected>${booking.title} - ${eventDate}</option>` + eventSelect.innerHTML;
    }
}

async function loadVendors() {
    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/vendors', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load vendors');
        }

        const result = await response.json();
        const vendors = Array.isArray(result) ? result : (result.vendors || []);

        renderVendors(vendors);

        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        const vendorCount = document.getElementById('vendorCount');
        if (vendorCount) {
            vendorCount.textContent = `${vendors.length} Vendor${vendors.length === 1 ? '' : 's'}`;
        }

    } catch (error) {
        console.error('Error loading vendors:', error);
        const vendorsGrid = document.getElementById('vendorsGrid');
        if (vendorsGrid) {
            vendorsGrid.innerHTML = '<p class="error-message">Could not load vendors. Please refresh.</p>';
        }
        showNotification('Failed to load vendors. Please try again.', 'error');
    }
}

function renderVendors(vendors) {
    const container = document.querySelector('.vendors-grid');
    if (!container) return;

    if (vendors.length === 0) {
        container.innerHTML = '<p class="empty-message">No vendors available at the moment.</p>';
        return;
    }

    container.innerHTML = vendors.map(vendor => `
        <div class="vendor-card" data-vendor-id="${vendor.id}">
            <div class="vendor-image">
                <img src="images/default-vendor.jpg" alt="${vendor.full_name}" onerror="this.src='images/default-vendor.jpg'">
            </div>
            <div class="vendor-details">
                <h3>${vendor.full_name}</h3>
                <p class="category">${vendor.services && vendor.services.length > 0 ? vendor.services.join(', ') : 'Event Services'}</p>
                <p class="location">📍 Available for Events</p>
                <div class="vendor-rating">
                    ⭐⭐⭐⭐☆ (${vendor.average_rating || 0})
                </div>
            </div>
            <button class="add-btn" onclick="addToCart(this)">+ Add to Event</button>
        </div>
    `).join('');
}

function addToCart(button) {
    if (!selectedBookingId) {
        showNotification('Please select an event first from the Events page.', 'error');
        return;
    }

    // Get vendor information from the card
    const card = button.closest('.vendor-card');
    const vendorId = card.getAttribute('data-vendor-id');
    const vendorName = card.querySelector('.vendor-details h3').textContent;
    const vendorCategory = card.querySelector('.category').textContent;
    const vendorLocation = card.querySelector('.location').textContent;

    // Check if vendor already in cart
    const existingItem = cart.find(item => item.vendorId === vendorId);

    if (!existingItem) {
        cart.push({
            vendorId: vendorId,
            name: vendorName,
            category: vendorCategory,
            location: vendorLocation
        });

        // Update button
        button.textContent = '✓ Added';
        button.classList.add('added');
        button.disabled = true;

        // Show confirmation
        showNotification(`${vendorName} added to your event!`);
    } else {
        // Remove from cart
        cart = cart.filter(item => item.vendorId !== vendorId);
        button.textContent = '+ Add to Event';
        button.classList.remove('added');
        button.disabled = false;

        showNotification(`${vendorName} removed from your event!`);
    }

    updateCart();
}

function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const paymentSection = document.getElementById('paymentSection');
    const statusSection = document.querySelector('.status-section');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-message">No vendors added yet</p>';
        cartTotal.style.display = 'none';
        paymentSection.style.display = 'none';
        statusSection.style.display = 'none';
        document.querySelector('.status-summary').style.display = 'none';
        return;
    }

    // Build cart items HTML
    let cartHTML = '';

    cart.forEach((item, index) => {
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-category">${item.category}</div>
                    <div class="cart-item-location">${item.location}</div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
    });

    cartItemsDiv.innerHTML = cartHTML;

    // Update total
    if (cart.length > 0) {
        cartTotal.style.display = 'block';

        // Show send request button
        if (!document.querySelector('.send-request-btn')) {
            const requestBtn = document.createElement('button');
            requestBtn.className = 'send-request-btn';
            requestBtn.innerHTML = '📤 Send Vendor Requests';
            requestBtn.onclick = sendVendorRequests;
            requestBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-top: 15px;
                background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: 0.3s;
                font-size: 13px;`;
            requestBtn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 5px 15px rgba(39, 174, 96, 0.3)';
            };
            requestBtn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            };
            cartTotal.parentElement.appendChild(requestBtn);
        }
    }
}

function removeFromCart(index) {
    const vendorName = cart[index].name;
    const vendorId = cart[index].vendorId;
    cart.splice(index, 1);

    // Reset button state
    const buttons = document.querySelectorAll('.add-btn');
    buttons.forEach(btn => {
        const card = btn.closest('.vendor-card');
        if (card.getAttribute('data-vendor-id') === vendorId) {
            btn.textContent = '+ Add to Event';
            btn.classList.remove('added');
            btn.disabled = false;
        }
    });

    showNotification(`${vendorName} removed from event!`);
    updateCart();
}

async function sendVendorRequests() {
    if (cart.length === 0) {
        showNotification('Please add vendors before sending requests', 'error');
        return;
    }

    if (!selectedBookingId) {
        showNotification('No event selected. Please go back to Events page and select an event.', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Send requests for each vendor in cart
        const promises = cart.map(async (item) => {
            const requestData = {
                booking_id: selectedBookingId,
                vendor_id: item.vendorId,
                service_id: null // For now, we'll set service_id to null since we're just requesting vendor participation
            };

            const response = await fetch('/bookings/items', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Failed to send request to ${item.name}`);
            }

            return await response.json();
        });

        await Promise.all(promises);

        // Show success and redirect to events page
        showNotification('Vendor requests sent successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'events_page.html';
        }, 2000);

    } catch (error) {
        console.error('Error sending vendor requests:', error);
        showNotification('Failed to send some vendor requests. Please try again.', 'error');
    }
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Keep the existing functions for backward compatibility
function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function simulateResponses() {
    // This function can be removed or kept for testing purposes
    console.log('Simulate responses function called');
}
