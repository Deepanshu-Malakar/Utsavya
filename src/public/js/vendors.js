// ============================================================
// vendors.js – Customer Vendor Browsing & Booking Flow
// ============================================================
let cart = [];           // In-memory cart (synced from backend on load)
let existingItems = [];  // Already-submitted booking_items from backend
let selectedBookingId = null;
let selectedBookingTitle = null;
let statusPollInterval = null;

document.addEventListener('DOMContentLoaded', async function () {
    // Check for payment outcomes
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        const bId = urlParams.get('booking_id');
        if (bId) {
            // VERIFY WITH BACKEND (Manual fallback for localhost)
            try {
                await window.fetchWithAuth(`/payments/verify/${bId}`);
            } catch (e) {
                console.error('Verification failed:', e);
            }
        }
        const banner = document.getElementById('paymentBanner');
        if (banner) banner.style.display = 'block';
        setTimeout(() => { if (banner) banner.style.display = 'none'; }, 10000);
    } else if (urlParams.get('payment') === 'cancelled') {
        showNotification('Payment was cancelled. Your vendor selections are still saved.', 'error');
    }

    // Check if coming from events page with a pre-selected booking
    selectedBookingId = sessionStorage.getItem('selectedBookingId') || urlParams.get('booking_id');
    selectedBookingTitle = sessionStorage.getItem('selectedBookingTitle');
    if (selectedBookingId) {
        sessionStorage.removeItem('selectedBookingId');
        sessionStorage.removeItem('selectedBookingTitle');
        // Hydrate state from backend
        await hydrateBookingState();
    }

    updateSelectedEventBanner();
    loadVendors();
});

// ------------------- BACKEND HYDRATION -------------------

// Called on startup to load existing booking_items into cart UI
async function hydrateBookingState() {
    if (!selectedBookingId) return;
    try {
        const res = await window.fetchWithAuth(`/bookings/${selectedBookingId}`);
        if (!res.ok) return;
        const booking = await res.json();

        selectedBookingTitle = selectedBookingTitle || booking.title;
        existingItems = booking.items || [];

        // Build the in-memory cart from accepted/pending items
        cart = existingItems
            .filter(item => !['rejected', 'cancelled'].includes(item.status))
            .map(item => ({
                vendorId: item.vendor_id,
                itemId: item.id,
                name: item.vendor_name || 'Vendor',
                category: item.service_title || '',
                location: '',
                serviceId: item.service_id,
                price: parseFloat(item.price_quote) || parseFloat(item.service_price) || 0,
                status: item.status   // 'pending' | 'accepted' | 'rejected'
            }));

        if (cart.length > 0) {
            updateCart();
            renderRequestStatus(existingItems);

            // If booking is already confirmed (paid), show that
            if (booking.status === 'confirmed') {
                showPaidState();
            } else {
                // Resume polling if there are pending items
                const hasPending = cart.some(i => i.status === 'pending');
                const allAccepted = cart.length > 0 && cart.every(i => i.status === 'accepted');
                if (hasPending) startStatusPolling();
                if (allAccepted) showPayNowButton(booking);
            }
        }
    } catch (e) {
        console.error('Failed to hydrate booking state:', e);
    }
}

// ------------------- BOOKING CONTEXT -------------------

function updateSelectedEventBanner() {
    let banner = document.getElementById('selectedEventBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'selectedEventBanner';
        banner.style.cssText = `
            color: white; padding: 12px 20px; text-align: center;
            font-size: 14px; font-weight: 500; position: sticky; top: 0; z-index: 100;
            transition: background 0.3s;
        `;
        const main = document.querySelector('.main-container');
        if (main) main.parentNode.insertBefore(banner, main);
    }

    if (selectedBookingId && selectedBookingTitle) {
        banner.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        banner.innerHTML = `📅 Adding vendors to: <strong>${selectedBookingTitle}</strong>
            <button onclick="changeEvent()" style="margin-left:12px; background:rgba(255,255,255,0.25); border:1px solid white;
            color:white; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;">Change</button>`;
    } else {
        banner.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
        banner.innerHTML = `⚠️ No event selected. Click <strong>"+ Add"</strong> on any vendor to choose your event.`;
    }
    banner.style.display = 'block';
}

function changeEvent() {
    selectedBookingId = null;
    selectedBookingTitle = null;
    cart = [];
    existingItems = [];
    updateCart();
    updateSelectedEventBanner();
    showEventSelectorModal(null, null);
}

// ------------------- LOAD & RENDER VENDORS -------------------

async function loadVendors() {
    try {
        const categoryVal = document.querySelector('input[name="category"]:checked')?.value || 'all';
        const budgetVal = document.getElementById('budgetSlider')?.value || 100000;
        const searchTerm = document.querySelector('.search-box input')?.value.toLowerCase().trim() || '';

        let url = new URL(window.location.origin + '/vendors');
        if (categoryVal !== 'all') url.searchParams.append('service', categoryVal);
        if (parseInt(budgetVal) < 100000) url.searchParams.append('max_price', budgetVal);
        if (searchTerm) url.searchParams.append('city', searchTerm);

        const response = await window.fetchWithAuth(url.pathname + url.search);
        if (!response.ok) throw new Error('Failed to load vendors');

        const result = await response.json();
        const vendors = Array.isArray(result) ? result : (result.vendors || result.data || []);

        renderVendors(vendors);

        document.getElementById('loadingIndicator')?.remove();
        const vendorCount = document.getElementById('vendorCount');
        if (vendorCount) vendorCount.textContent = `${vendors.length} Vendor${vendors.length === 1 ? '' : 's'}`;

    } catch (error) {
        console.error('Error loading vendors:', error);
        const grid = document.getElementById('vendorsGrid');
        if (grid) grid.innerHTML = '<p class="error-message">Could not load vendors. Please refresh.</p>';
        showNotification('Failed to load vendors.', 'error');
    }
}

function renderVendors(vendors) {
    const categoryImages = {
        venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
        catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
        photography: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
        music: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
        decor: 'https://images.unsplash.com/photo-1522673607200-164883efcdf1?auto=format&fit=crop&w=800&q=80',
        other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
    };

    const container = document.querySelector('.vendors-grid');
    if (!container) return;

    if (vendors.length === 0) {
        container.innerHTML = '<p class="empty-message">No vendors available at the moment.</p>';
        return;
    }

    container.innerHTML = vendors.map(vendor => {
        const rating = parseFloat(vendor.average_rating) || 0;
        const starsHtml = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
        const reviewCount = parseInt(vendor.total_reviews) || 0;

        // Price: use starting_price from search API; fall back to nested services
        const minPrice = parseFloat(vendor.starting_price) ||
            (() => {
                const svcs = vendor.services || [];
                const prices = svcs.map(s => parseFloat(s.price) || 0).filter(p => p > 0);
                return prices.length > 0 ? Math.min(...prices) : 0;
            })();

        const priceDisplay = minPrice > 0 ? `₹${minPrice.toLocaleString('en-IN')}+` : 'Contact for price';
        const city = vendor.city || vendor.business_city || '';

        const servicesList = vendor.services || [];
        const mainCategory = (servicesList[0]?.category || vendor.category || 'other').toLowerCase();
        const fallbackImg = categoryImages[mainCategory] || categoryImages.other;
        
        const categories = servicesList.length > 0
            ? servicesList.slice(0, 2).map(s => typeof s === 'string' ? s : (s.category || s.title)).filter(Boolean).join(', ')
            : (vendor.category || 'Event Services');

        const profileImg = vendor.profile_image || fallbackImg;

        // Check if already in cart (persistent from backend)
        const existingItem = existingItems.find(i => i.vendor_id === vendor.id && !['rejected', 'cancelled'].includes(i.status));
        const inCart = existingItem || cart.some(i => i.vendorId === vendor.id);
        const itemStatus = existingItem?.status || (inCart ? 'pending' : null);

        const statusBadge = itemStatus === 'accepted'
            ? `<span style="background:#27ae60;color:white;padding:2px 8px;border-radius:4px;font-size:11px;">✅ Accepted</span>`
            : itemStatus === 'pending'
            ? `<span style="background:#f39c12;color:white;padding:2px 8px;border-radius:4px;font-size:11px;">⏳ Pending</span>`
            : '';

        return `
            <div class="vendor-card" data-vendor-id="${vendor.id}">
                <div class="vendor-image" onclick="openVendorProfile('${vendor.id}')" style="cursor:pointer;">
                    <img src="${profileImg}" alt="${vendor.full_name}" onerror="this.src='${categoryImages.other}'">
                    <div class="vendor-image-overlay"><span>View Profile →</span></div>
                </div>
                <div class="vendor-details">
                    <h3 onclick="openVendorProfile('${vendor.id}')" style="cursor:pointer;">${vendor.full_name || 'Vendor'}</h3>
                    <p class="category">🏷️ ${categories}</p>
                    ${city ? `<p class="location">📍 ${city}</p>` : ''}
                    <div style="color:#f39c12; font-size:14px; margin: 6px 0;">
                        ${starsHtml}
                        <span style="color:#999; font-size:12px; margin-left:5px;">${rating > 0 ? rating.toFixed(1) : 'No rating'} (${reviewCount})</span>
                    </div>
                    <div style="font-size:16px; font-weight:700; color:#27ae60; margin: 5px 0;">${priceDisplay}</div>
                    ${statusBadge}
                </div>
                <div style="padding: 12px 20px 16px; display:flex; gap:8px; border-top:1px solid #f5f5f5;">
                    <button onclick="openVendorProfile('${vendor.id}')"
                        style="flex:1; padding:9px; border:2px solid #e53935; background:transparent; color:#e53935; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; transition:0.3s;"
                        onmouseover="this.style.background='#e53935';this.style.color='white'"
                        onmouseout="this.style.background='transparent';this.style.color='#e53935'">👁 Profile</button>
                    <button class="add-btn ${inCart ? 'added' : ''}" onclick="addToCart(this)"
                        style="flex:1;" ${inCart ? 'disabled' : ''}>
                        ${itemStatus === 'accepted' ? '✅ Accepted' : inCart ? '✓ Added' : '+ Add'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openVendorProfile(id) {
    window.location.href = `vendor_profile.html?id=${id}`;
}

function formatServicePrice(service) {
    const price = parseFloat(service.price) || 0;
    if (!price) return 'Contact for price';
    return `₹${price.toLocaleString('en-IN')}${service.price_type === 'per_person' ? ' / person' : ''}`;
}

function askServiceSelection(vendorName, services) {
    return new Promise((resolve) => {
        if (!Array.isArray(services) || services.length === 0) {
            resolve(null);
            return;
        }

        if (services.length === 1) {
            resolve(services[0]);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay service-selector-overlay';
        modal.innerHTML = `
            <div class="service-selector-modal">
                <button class="service-selector-close" type="button">&times;</button>
                <h3>Select a Service</h3>
                <p>Choose the service you want to book from ${vendorName}.</p>
                <div class="service-selector-list">
                    ${services.map(service => `
                        <button class="service-option-btn" type="button" data-service-id="${service.id}">
                            <div class="service-option-copy">
                                <strong>${service.title || 'Service'}</strong>
                                <span>${service.description ? service.description.substring(0, 100) : 'Professional event service'}</span>
                            </div>
                            <em>${formatServicePrice(service)}</em>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const close = (selected = null) => {
            modal.remove();
            resolve(selected);
        };

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('service-selector-close')) {
                close(null);
            }
        });

        modal.querySelectorAll('.service-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = services.find(service => service.id === btn.dataset.serviceId) || null;
                close(selected);
            });
        });

        document.body.appendChild(modal);
    });
}

// ------------------- EVENT SELECTOR MODAL -------------------

async function showEventSelectorModal(buttonEl, vendorCard) {
    try {
        const res = await window.fetchWithAuth('/bookings');
        if (!res.ok) throw new Error('Failed to load events');
        const bookings = await res.json();
        const activeBookings = bookings.filter(b => ['planning', 'pending'].includes(b.status));

        if (activeBookings.length === 0) {
            showNotification('No active events found. Please create one on the Events page first.', 'error');
            setTimeout(() => { window.location.href = 'events_page.html'; }, 2500);
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'eventSelectorModal';
        modal.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:3000;
            display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif;
        `;
        modal.innerHTML = `
            <div style="background:white; border-radius:16px; padding:30px; width:420px; max-width:90vw; max-height:80vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                <h3 style="margin:0 0 6px; font-size:18px;">📅 Select an Event</h3>
                <p style="color:#888; font-size:13px; margin:0 0 20px;">Choose which event you want to add this vendor to.</p>
                ${activeBookings.map(b => `
                    <div onclick="selectEventFromModal('${b.id}','${(b.title||'').replace(/'/g,"\\'")}',this)"
                        style="border:2px solid #eee; border-radius:10px; padding:14px 16px; cursor:pointer; margin-bottom:10px; transition:0.2s;"
                        onmouseover="this.style.borderColor='#e53935';this.style.background='#fff5f5'"
                        onmouseout="this.style.borderColor='#eee';this.style.background='white'">
                        <div style="font-weight:600; color:#222;">🎉 ${b.title}</div>
                        <div style="font-size:12px; color:#888;">📍 ${b.location || 'No location'} &nbsp;|&nbsp; 📅 ${new Date(b.event_start).toLocaleDateString('en-IN')}</div>
                    </div>
                `).join('')}
                <button onclick="document.getElementById('eventSelectorModal').remove()"
                    style="margin-top:10px; width:100%; padding:10px; border:2px solid #ddd; background:transparent; border-radius:8px; cursor:pointer; color:#666;">Cancel</button>
            </div>
        `;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
        window._pendingAddButton = buttonEl;

    } catch (err) {
        showNotification('Could not load your events. Please try again.', 'error');
    }
}

async function selectEventFromModal(bookingId, bookingTitle, el) {
    selectedBookingId = bookingId;
    selectedBookingTitle = bookingTitle;
    cart = [];
    existingItems = [];
    document.getElementById('eventSelectorModal')?.remove();

    // Hydrate with any existing items for this booking
    await hydrateBookingState();
    updateSelectedEventBanner();

    if (window._pendingAddButton) {
        addToCart(window._pendingAddButton);
        window._pendingAddButton = null;
    }
}

// ------------------- CART MANAGEMENT -------------------

async function addToCart(button) {
    if (!selectedBookingId) {
        showEventSelectorModal(button, button.closest('.vendor-card'));
        return;
    }

    const card = button.closest('.vendor-card');
    const vendorId = card.getAttribute('data-vendor-id');
    const vendorName = card.querySelector('.vendor-details h3').textContent;

    if (existingItems.find(i => i.vendor_id === vendorId && !['rejected', 'cancelled'].includes(i.status))) {
        showNotification(`${vendorName} is already in your booking.`, 'error');
        return;
    }
    if (cart.find(i => i.vendorId === vendorId)) {
        showNotification(`${vendorName} is already added.`, 'error');
        return;
    }

    button.textContent = 'Loading...';
    button.disabled = true;

    try {
        const response = await window.fetchWithAuth(`/vendors/${vendorId}`);
        const profile = await response.json();
        const services = profile.services || [];
        if (services.length === 0) throw new Error('No services found for this vendor');

        const selectedService = await askServiceSelection(vendorName, services);
        if (!selectedService) {
            button.textContent = '+ Add';
            button.disabled = false;
            return;
        }

        cart.push({
            vendorId,
            name: vendorName,
            category: selectedService.title || 'Service',
            location: card.querySelector('.location')?.textContent || '',
            serviceId: selectedService.id,
            price: parseFloat(selectedService.price) || 0,
            priceType: selectedService.price_type || 'fixed',
            status: 'cart'
        });

        button.textContent = 'Added';
        button.classList.add('added');
        button.disabled = true;
        showNotification(`${vendorName} added with ${selectedService.title || 'the selected service'}!`);
        updateCart();
    } catch (err) {
        button.textContent = '+ Add';
        button.disabled = false;
        showNotification(`Failed to add: ${err.message}`, 'error');
    }
}
function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const paymentSection = document.getElementById('paymentSection');
    const statusSection = document.querySelector('.status-section');

    // Merge existing backend items + new local-only cart items for display
    const allDisplayItems = [
        ...existingItems.filter(i => !['rejected', 'cancelled'].includes(i.status)).map(i => ({
            ...i,
            displayName: i.vendor_name || 'Vendor',
            displayCategory: i.service_title || '',
            displayPrice: parseFloat(i.price_quote) || parseFloat(i.service_price) || 0,
            isBackend: true
        })),
        ...cart.filter(i => i.status === 'cart').map(i => ({
            ...i,
            displayName: i.name,
            displayCategory: i.category,
            displayPrice: i.price,
            isBackend: false
        }))
    ];

    if (allDisplayItems.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-message">No vendors added yet</p>';
        if (cartTotal) cartTotal.style.display = 'none';
        if (paymentSection) paymentSection.style.display = 'none';
        if (statusSection) statusSection.style.display = 'none';
        document.querySelector('.send-request-btn')?.remove();
        return;
    }

    const statusColor = { accepted: '#27ae60', pending: '#f39c12', rejected: '#e74c3c', cart: '#3498db' };
    const statusIcon = { accepted: '✅', pending: '⏳', rejected: '❌', cart: '🛒' };

    cartItemsDiv.innerHTML = allDisplayItems.map((item, idx) => `
        <div class="cart-item" style="border-left: 3px solid ${statusColor[item.status] || '#aaa'};">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.displayName}</div>
                <div class="cart-item-category">${item.displayCategory}</div>
                <div style="font-weight:700;color:#27ae60;font-size:13px;">₹${(item.displayPrice || 0).toLocaleString()}</div>
                <div style="font-size:11px; color:${statusColor[item.status] || '#aaa'}; margin-top:3px;">
                    ${statusIcon[item.status] || ''} ${item.status === 'cart' ? 'Ready to send' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>
            </div>
            ${!item.isBackend ? `<button class="remove-btn" onclick="removeLocalCartItem('${item.vendorId}')">✕</button>` : ''}
        </div>
    `).join('');

    // Total = accepted price_quote + local cart prices
    const total = allDisplayItems.reduce((sum, i) => sum + (i.displayPrice || 0), 0);
    if (cartTotal) {
        cartTotal.style.display = 'flex';
        document.getElementById('totalPrice').textContent = `₹${total.toLocaleString()}`;
    }

    if (statusSection) statusSection.style.display = 'block';

    // Show "Send Request" btn only if there are unsent local items
    const hasLocalItems = cart.some(i => i.status === 'cart');
    if (hasLocalItems && !document.querySelector('.send-request-btn')) {
        const btn = document.createElement('button');
        btn.className = 'send-request-btn';
        btn.innerHTML = '📤 Send Vendor Requests';
        btn.onclick = sendVendorRequests;
        btn.style.cssText = `width:100%; padding:12px; margin-top:15px; background:linear-gradient(135deg,#27ae60,#229954); color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.3s;`;
        cartTotal.parentElement.appendChild(btn);
    } else if (!hasLocalItems) {
        document.querySelector('.send-request-btn')?.remove();
    }
}

function removeLocalCartItem(vendorId) {
    cart = cart.filter(i => i.vendorId !== vendorId);
    // Reset vendor card button
    document.querySelectorAll('.vendor-card').forEach(card => {
        if (card.getAttribute('data-vendor-id') === vendorId) {
            const btn = card.querySelector('.add-btn');
            if (btn) { btn.textContent = '+ Add'; btn.classList.remove('added'); btn.disabled = false; }
        }
    });
    updateCart();
}

// ------------------- SEND REQUESTS -------------------

async function sendVendorRequests() {
    const localItems = cart.filter(i => i.status === 'cart');
    if (localItems.length === 0) return showNotification('No new vendors to send requests to.', 'error');
    if (!selectedBookingId) return showNotification('No event selected.', 'error');

    const btn = document.querySelector('.send-request-btn');
    if (btn) { btn.textContent = '⏳ Sending...'; btn.disabled = true; }

    try {
        for (const item of localItems) {
            const res = await window.fetchWithAuth('/bookings/items', {
                method: 'POST',
                body: JSON.stringify({ booking_id: selectedBookingId, vendor_id: item.vendorId, service_id: item.serviceId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || `Failed for ${item.name}`);
            }
            // Mark as sent (pending)
            item.status = 'pending';
        }

        showNotification('✅ Vendor requests sent! Waiting for approval...', 'success');
        // Reload from backend
        await hydrateBookingState();
        startStatusPolling();

    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
        if (btn) { btn.textContent = '📤 Send Vendor Requests'; btn.disabled = false; }
    }
}

// ------------------- STATUS POLLING -------------------

function startStatusPolling() {
    if (statusPollInterval) clearInterval(statusPollInterval);
    statusPollInterval = setInterval(async () => {
        if (!selectedBookingId) return;
        try {
            const res = await window.fetchWithAuth(`/bookings/${selectedBookingId}`);
            if (!res.ok) return;
            const booking = await res.json();
            existingItems = booking.items || [];

            // Rebuild cart from backend
            cart = cart.filter(i => i.status === 'cart'); // keep local unsent
            updateCart();
            renderRequestStatus(existingItems);

            if (booking.status === 'confirmed') {
                clearInterval(statusPollInterval);
                showPaidState();
                return;
            }

            const accepted = existingItems.filter(i => i.status === 'accepted');
            const pending = existingItems.filter(i => i.status === 'pending');

            if (accepted.length > 0 && pending.length === 0) {
                clearInterval(statusPollInterval);
                showPayNowButton(booking);
            }
        } catch (e) { console.error(e); }
    }, 10000);
}

function renderRequestStatus(items) {
    const statusItemsDiv = document.getElementById('statusItems');
    const statusSummary = document.getElementById('statusSummary');
    const statusSection = document.querySelector('.status-section');

    if (!statusItemsDiv || !items.length) return;
    if (statusSection) statusSection.style.display = 'block';

    const accepted = items.filter(i => i.status === 'accepted').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const rejected = items.filter(i => i.status === 'rejected').length;

    if (statusSummary) {
        statusSummary.style.display = 'flex';
        document.getElementById('acceptedCount').textContent = accepted;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('deniedCount').textContent = rejected;
    }

    statusItemsDiv.innerHTML = items.map(item => {
        const colorMap = { accepted: '#27ae60', pending: '#f39c12', rejected: '#e74c3c' };
        const iconMap = { accepted: '✅', pending: '⏳', rejected: '❌' };
        const s = item.status || 'pending';
        return `
            <div style="padding:10px 0; border-bottom:1px solid #f5f5f5;">
                <div style="font-weight:600; font-size:13px;">${item.vendor_name || 'Vendor'}</div>
                <div style="font-size:12px; margin-top:2px;">${item.service_title || ''}</div>
                <div style="font-size:12px; color:${colorMap[s] || '#999'}; margin-top:3px;">
                    ${iconMap[s] || '⏳'} ${s.charAt(0).toUpperCase() + s.slice(1)}
                    ${item.price_quote ? ` · ₹${parseFloat(item.price_quote).toLocaleString()}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showPayNowButton(booking) {
    const paymentSection = document.getElementById('paymentSection');
    if (!paymentSection) return;
    const acceptedItems = existingItems.filter(i => i.status === 'accepted');
    const total = acceptedItems.reduce((sum, i) => sum + (parseFloat(i.price_quote) || 0), 0);
    paymentSection.style.display = 'block';
    paymentSection.innerHTML = `
        <h3>💳 Payment</h3>
        <p style="font-size:13px; color:#27ae60; font-weight:600;">🎉 All vendors approved!</p>
        <p style="font-size:12px; color:#888; margin:0 0 12px;">Total: <strong>₹${total.toLocaleString()}</strong></p>
        <button onclick="proceedToPayment(${total})" class="proceed-payment-btn" style="width:100%; padding:12px; background:linear-gradient(135deg,#e53935,#c62828); color:white; border:none; border-radius:8px; font-weight:700; font-size:14px; cursor:pointer;">
            💳 Pay ₹${total.toLocaleString()} Now →
        </button>
    `;
}

function showPaidState() {
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
        paymentSection.style.display = 'block';
        paymentSection.innerHTML = `
            <h3>💳 Payment</h3>
            <p style="color:#27ae60; font-weight:600; font-size:14px;">✅ Payment Confirmed!</p>
            <a href="events_page.html" style="display:block; margin-top:10px; padding:10px; background:#27ae60; color:white; text-align:center; border-radius:8px; text-decoration:none; font-weight:600;">
                View in Upcoming Events →
            </a>
        `;
    }
}

// ------------------- PAYMENT -------------------

async function proceedToPayment(totalOverride) {
    if (!selectedBookingId) return showNotification('Please select an event first.', 'error');

    const totalAmt = totalOverride ||
        existingItems.filter(i => i.status === 'accepted').reduce((sum, i) => sum + (parseFloat(i.price_quote) || 0), 0);

    if (totalAmt === 0) return showNotification('Total amount is 0. Please ensure vendors have set a price.', 'error');

    try {
        showNotification('Redirecting to payment gateway...', 'success');
        const res = await window.fetchWithAuth('/payments', {
            method: 'POST',
            body: JSON.stringify({ booking_id: selectedBookingId, amount: totalAmt })
        });

        if (res.ok) {
            const data = await res.json();
            const checkoutUrl = data.checkout_url || data.url;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                showNotification('Payment initiated. Check your email for confirmation.', 'success');
            }
        } else {
            const err = await res.json();
            showNotification('Payment Failed: ' + (err.message || 'Please try again.'), 'error');
        }
    } catch (err) {
        showNotification('Payment gateway error. Please try again.', 'error');
    }
}

// ------------------- NOTIFICATIONS -------------------

function showNotification(message, type = 'success') {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => { if (n.parentElement) n.remove(); }, 4000);
}

// ------------------- VENDOR REVIEWS -------------------

async function showVendorReviews(vendorId, vendorName) {
    try {
        const res = await fetch(`/reviews/vendors/${vendorId}/reviews`);
        const data = await res.json();
        const reviews = data.reviews || [];
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;font-family:Poppins,sans-serif;';
        let reviewsHtml = reviews.length === 0 ? '<p>No reviews yet.</p>' : reviews.map(r => `
            <div style="border-bottom:1px solid #eee;padding:15px 0;">
                <div style="display:flex;justify-content:space-between;"><strong>${r.customer_name}</strong><span style="color:#f39c12;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
                <p style="font-size:14px;color:#555;margin:10px 0;">${r.comment||'No comment.'}</p>
                <small style="color:#999;">${new Date(r.created_at).toLocaleDateString()}</small>
            </div>`).join('');
        modal.innerHTML = `<div style="background:white;padding:30px;border-radius:15px;width:500px;max-height:80vh;overflow-y:auto;position:relative;">
            <button onclick="this.closest('.modal-overlay').remove()" style="position:absolute;top:15px;right:15px;border:none;background:none;font-size:20px;cursor:pointer;">&times;</button>
            <h3 style="margin-top:0;">Reviews for ${vendorName}</h3>
            <div style="margin-top:20px;">${reviewsHtml}</div></div>`;
        document.body.appendChild(modal);
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
    } catch (err) {
        showNotification('Failed to load reviews.', 'error');
    }
}

function closeRequestModal() { document.getElementById('requestModal')?.style && (document.getElementById('requestModal').style.display = 'none'); }
function simulateResponses() {}
