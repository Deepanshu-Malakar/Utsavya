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
        const response = await window.fetchWithAuth(`/bookings/${selectedBookingId}`);
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
        // Fetch DOM filters if evaluating
        const categoryVal = document.querySelector('input[name="category"]:checked')?.value || 'all';
        const budgetVal = document.getElementById('budgetSlider')?.value || 100000;
        const searchTerm = document.querySelector('.search-box input')?.value.toLowerCase().trim() || '';
        
        let url = new URL(window.location.origin + '/vendors');
        if (categoryVal !== 'all') url.searchParams.append('service', categoryVal);
        if (budgetVal < 100000) url.searchParams.append('max_price', budgetVal);
        if (searchTerm) url.searchParams.append('city', searchTerm); // matching text to city or service name based on API support

        const response = await window.fetchWithAuth(url.pathname + url.search);

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

    container.innerHTML = vendors.map(vendor => {
        const rating = parseFloat(vendor.average_rating) || 0;
        const fullStars = Math.round(rating);
        const starsHtml = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        const reviewCount = parseInt(vendor.total_reviews) || 0;

        // Get starting price from first service
        const services = vendor.services || [];
        const minPrice = services.length > 0
            ? Math.min(...services.map(s => parseFloat(s.price) || 0))
            : 0;
        const priceDisplay = minPrice > 0
            ? `₹${minPrice.toLocaleString('en-IN')}+`
            : 'Contact for price';

        const city = vendor.city || (services[0]?.city) || '';
        const categories = services.length > 0
            ? services.slice(0, 2).map(s => s.category || s.title).filter(Boolean).join(', ')
            : 'Event Services';

        const profileImg = vendor.profile_image || 'images/default-vendor.jpg';

        return `
            <div class="vendor-card" data-vendor-id="${vendor.id}">
                <div class="vendor-image" onclick="openVendorProfile('${vendor.id}')" style="cursor:pointer;" title="View ${vendor.full_name}'s profile">
                    <img src="${profileImg}" alt="${vendor.full_name}" onerror="this.src='images/default-vendor.jpg'">
                    <div class="vendor-image-overlay">
                        <span>View Profile →</span>
                    </div>
                </div>
                <div class="vendor-details">
                    <h3 onclick="openVendorProfile('${vendor.id}')" style="cursor:pointer;">${vendor.full_name}</h3>
                    <p class="category">🏷️ ${categories}</p>
                    ${city ? `<p class="location">📍 ${city}</p>` : ''}
                    <div class="vendor-rating" style="color:#f39c12; font-size:14px; margin: 6px 0;">
                        ${starsHtml}
                        <span style="color:#999; font-size:12px; margin-left:5px;">${rating > 0 ? rating.toFixed(1) : 'No rating'} (${reviewCount})</span>
                    </div>
                    <div class="vendor-price" style="font-size:16px; font-weight:700; color:#27ae60; margin: 5px 0;">
                        ${priceDisplay}
                    </div>
                </div>
                <div class="vendor-card-actions" style="padding: 12px 20px 16px; display:flex; gap:8px; border-top:1px solid #f5f5f5;">
                    <button class="view-profile-btn" onclick="openVendorProfile('${vendor.id}')" style="flex:1; padding:9px; border:2px solid #e53935; background:transparent; color:#e53935; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; transition:0.3s;" onmouseover="this.style.background='#e53935';this.style.color='white'" onmouseout="this.style.background='transparent';this.style.color='#e53935'">👁 Profile</button>
                    <button class="add-btn" onclick="addToCart(this)" style="flex:1;">+ Add</button>
                </div>
            </div>
        `;
    }).join('');
}

function openVendorProfile(id) {
    window.location.href = `vendor_profile.html?id=${id}`;
}


async function addToCart(button) {
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
        button.textContent = 'Loading...';
        button.disabled = true;

        try {
            // Fetch vendor profile to get a valid service_id
            const response = await window.fetchWithAuth(`/vendors/${vendorId}`);
            const profile = await response.json();
            
            let serviceId = null;
            let price = 0;
            if (profile.services && profile.services.length > 0) {
                serviceId = profile.services[0].id;
                price = parseFloat(profile.services[0].price) || 0;
            } else {
                throw new Error("No services found for this vendor");
            }

            cart.push({
                vendorId: vendorId,
                name: vendorName,
                category: vendorCategory,
                location: vendorLocation,
                serviceId: serviceId,
                price: price
            });

            // Update button
            button.textContent = '✓ Added';
            button.classList.add('added');
            button.disabled = true;

            // Show confirmation
            showNotification(`${vendorName} added to your event!`);
            updateCart();
        } catch (err) {
            console.error(err);
            button.textContent = '+ Add to Event';
            button.disabled = false;
            showNotification(`Failed to add vendor: Please ensure vendor has active services.`, "error");
        }
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
        cartTotal.style.display = 'flex';
        paymentSection.style.display = 'block';

        const totalAmt = cart.reduce((acc, item) => acc + item.price, 0);
        document.getElementById('totalPrice').textContent = `₹${totalAmt.toLocaleString()}`;

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
        // Send requests for each vendor in cart
        const promises = cart.map(async (item) => {
            const response = await window.fetchWithAuth('/bookings/items', {
                method: 'POST',
                body: JSON.stringify({
                    booking_id: selectedBookingId,
                    vendor_id: item.vendorId,
                    service_id: item.serviceId
                })
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

async function proceedToPayment() {
    if (!selectedBookingId) return showNotification("Please select an event first.", "error");
    if (cart.length === 0) return showNotification("Cart is empty.", "error");

    const totalAmt = cart.reduce((acc, item) => acc + item.price, 0);

    try {
        const res = await window.fetchWithAuth('/payments', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: selectedBookingId,
                amount: totalAmt
            })
        });

        if (res.ok) {
            const data = await res.json();
            showNotification(`Payment intent initialized.`, "success");
            setTimeout(() => {
                window.location.href = data.url || 'events_page.html';
            }, 2000);
        } else {
            const err = await res.json();
            showNotification("Payment Failed: " + err.message, "error");
        }
    } catch(err) {
        showNotification("Payment gateway error", "error");
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

async function showVendorReviews(vendorId, vendorName) {
    try {
        const res = await fetch(`/reviews/vendors/${vendorId}/reviews`);
        const data = await res.json();
        const reviews = data.reviews || [];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 2000; font-family: 'Poppins', sans-serif;
        `;

        let reviewsHtml = reviews.length === 0 ? '<p>No reviews yet.</p>' : reviews.map(r => `
            <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${r.customer_name}</strong>
                    <span style="color: #f39c12;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                </div>
                <p style="font-size: 14px; color: #555; margin: 10px 0;">${r.comment || 'No comment provided.'}</p>
                <div style="display: flex; gap: 5px;">
                    ${(r.media || []).map(m => `
                        <img src="${m.url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                    `).join('')}
                </div>
                <small style="color: #999;">${new Date(r.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; width: 500px; max-height: 80vh; overflow-y: auto; position: relative;">
                <button onclick="this.closest('.modal-overlay').remove()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">&times;</button>
                <h3 style="margin-top: 0;">Reviews for ${vendorName}</h3>
                <div style="margin-top: 20px;">${reviewsHtml}</div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (err) {
        console.error(err);
        showNotification("Failed to load reviews.", "error");
    }
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
