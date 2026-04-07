let isLoading = false;
let currentBookingsMap = new Map();

document.addEventListener('DOMContentLoaded', function () {

    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 1000, once: true });
    }

    if (typeof particlesJS !== 'undefined') {
        particlesJS("particles-js", {
            particles: {
                number: { value: 80 },
                color: { value: "#ffffff" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                move: {
                    enable: true,
                    speed: 1,
                    direction: "top",
                    random: true,
                    straight: false,
                    out_mode: "out"
                }
            }
        });
    }

    setupEventListeners();
    loadUserEvents();
});

function setupEventListeners() {

    document.addEventListener('click', function (e) {

        if (e.target.classList.contains('btn-complete')) {
            const id = e.target.dataset.bookingId;
            if (id) completeBooking(id);
        }

        if (e.target.classList.contains('btn-outline') &&
            e.target.textContent.includes('View Event Details')) {
            const id = e.target.dataset.bookingId;
            if (id) viewEventDetails(id);
        }
        
        if (e.target.classList.contains('btn-edit-dates')) {
            const id = e.target.dataset.bookingId;
            if (id) showEditDatesModal(id);
        }
        
        if (e.target.classList.contains('btn-review')) {
            const id = e.target.dataset.bookingId;
            if (id) showReviewModal(id);
        }
    });

    const createEventBtn = document.querySelector('.btn-primary');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', showCreateEventModal);
    }
}

async function loadUserEvents() {
    if (isLoading) return;
    isLoading = true;

    try {
        const response = await window.fetchWithAuth('/bookings');

        if (!response.ok) throw new Error('Failed to load');

        const bookings = await response.json();

        const now = new Date();
        const incomplete = [];
        const upcoming = [];
        const past = [];

        bookings.forEach(b => {
            const d = new Date(b.event_start);

            if (b.status === 'planning' || b.status === 'pending') {
                incomplete.push(b);
            } else if (d > now && b.status !== 'cancelled') {
                upcoming.push(b);
            } else {
                past.push(b);
            }
        });

        renderIncompleteBookings(incomplete);
        renderUpcomingEvents(upcoming);
        renderPastEvents(past);

    } catch (err) {
        console.error(err);
        showError('Failed to load events');
    } finally {
        isLoading = false;
    }
}

function renderIncompleteBookings(bookings) {
    const container = document.querySelector('.card-grid');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const newMap = new Map();

    bookings.forEach(b => {
        let card = currentBookingsMap.get(b.id);

        if (!card) {
            card = createBookingCard(b);
        } else {
            updateBookingCard(card, b);
        }

        newMap.set(b.id, card);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    currentBookingsMap = newMap;
}

function createBookingCard(b) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.setAttribute('data-aos', 'fade-up');

    const eventImages = {
        wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        birthday: 'https://images.unsplash.com/photo-1530103862676-fa8c91811617?auto=format&fit=crop&w=800&q=80',
        corporate: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80',
        default: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
    };

    const lowerTitle = b.title.toLowerCase();
    let imgSrc = eventImages.default;
    if (lowerTitle.includes('wed')) imgSrc = eventImages.wedding;
    else if (lowerTitle.includes('birth')) imgSrc = eventImages.birthday;
    else if (lowerTitle.includes('corp')) imgSrc = eventImages.corporate;
    else if (lowerTitle.includes('fest')) imgSrc = eventImages.festival;

    const img = document.createElement('img');
    img.src = imgSrc;
    img.loading = "lazy";

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h4');
    const date = document.createElement('p');
    const location = document.createElement('p');
    const status = document.createElement('p');

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const fill = document.createElement('div');
    fill.className = 'fill';
    progressBar.appendChild(fill);

    const btn = document.createElement('button');
    btn.className = 'btn-complete';

    body.append(title, date, location, status, progressBar, btn);
    card.append(img, body);

    updateBookingCard(card, b);

    return card;
}

function updateBookingCard(card, b) {
    const date = new Date(b.event_start).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const progress = calculateProgress(b);
    const statusText = getStatusText(b.status);

    const body = card.querySelector('.card-body');

    body.children[0].textContent = b.title;
    body.children[1].textContent = `📅 ${date}`;
    body.children[2].textContent = `📍 ${b.location || 'Location TBD'}`;
    body.children[3].textContent = `⚠️ ${statusText}`;
    body.children[4].querySelector('.fill').style.width = `${progress}%`;

    // ADD VENDOR LISTING TO INCOMPLETE CARD
    let vendorsList = body.querySelector('.assigned-vendors');
    if (!vendorsList) {
        vendorsList = document.createElement('div');
        vendorsList.className = 'assigned-vendors';
        vendorsList.style.marginTop = '10px';
        body.insertBefore(vendorsList, body.children[5]);
    }
    if (b.vendors && b.vendors.length > 0) {
        vendorsList.innerHTML = `<p style="font-size:12px; font-weight:600; margin-bottom:5px;">Vendors (${b.vendors.length}):</p>` + 
            b.vendors.map(v => `<span class="vendor-badge" style="${v.is_selected ? 'border-color:var(--primary-red); color:var(--primary-red);' : ''}">${v.is_selected ? 'Selected: ' : ''}${v.vendor_name}${v.service_title ? ` (${v.service_title})` : ''}</span>`).join('');
    } else {
        vendorsList.innerHTML = '<p style="font-size:11px; color:#999; font-style:italic;">No vendors added yet</p>';
    }

    const btn = body.children[6];
    btn.textContent = "Continue Planning";
    btn.dataset.bookingId = b.id;
}

function renderUpcomingEvents(bookings) {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:20px; font-size:14px;">No upcoming events yet. Complete your bookings to see them here!</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    bookings.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const statusBadge = b.status === 'confirmed'
            ? `<span style="background:#27ae60; color:white; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">✅ Confirmed</span>`
            : `<span style="background:#f39c12; color:white; padding:2px 8px; border-radius:4px; font-size:11px;">⏳ ${b.status}</span>`;

        let vendorsHtml = '';
        if (b.vendors && Array.isArray(b.vendors) && b.vendors.length > 0) {
            // Priority to selected vendors, but show others if it's confirmed
            vendorsHtml = `
                <div class="assigned-vendors">
                    ${b.vendors.map(v => `<span class="vendor-badge" style="${v.is_selected ? 'border-color:#27ae60; color:#27ae60;' : ''}">${v.is_selected ? '✅ ' : '👤 '}${v.vendor_name} (${v.service_title})</span>`).join('')}
                </div>
            `;
        } else {
            vendorsHtml = `<div class="assigned-vendors"><span style="font-size:11px; color:#999; font-style:italic;">No selected vendors found</span></div>`;
        }

        div.innerHTML = `
            <div style="flex: 1;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <span style="font-size:13px; color:#666; background:#eee; padding:2px 8px; border-radius:4px;">${formatShortDate(b.event_start)}</span>
                    <h4 style="margin:0; font-size:1.1rem; color:#333;">${b.title}</h4>
                    ${statusBadge}
                </div>
                <div style="font-size:13px; color:#555; margin-bottom:10px;">📍 ${b.location || 'TBD'}</div>
                ${vendorsHtml}
            </div>
            <button class="btn-outline btn-edit-dates" data-booking-id="${b.id}" style="border-color: #3498db; color: #3498db; padding: 8px 16px; font-size: 13px; font-weight:600;">📅 Reschedule</button>
        `;
        fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}


function renderPastEvents(bookings) {
    const container = document.getElementById('pastEventsList');
    if (!container) return;

    const fragment = document.createDocumentFragment();

    bookings.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const servicesSummary = Array.isArray(b.vendors) && b.vendors.length > 0
            ? b.vendors.map(v => `${v.vendor_name}${v.service_title ? ` (${v.service_title})` : ''}`).join(', ')
            : 'No vendor services booked';

        div.innerHTML = `
            <span>${formatShortDate(b.event_start)}</span>
            <span>${b.title}</span>
            <span style="font-size:12px; color:#666;">${servicesSummary}</span>
            <span>📍 ${b.location || 'TBD'}</span>
            <button class="btn-outline btn-review" data-booking-id="${b.id}" style="border-color: #f39c12; color: #f39c12; font-size: 13px; padding: 5px 10px;">⭐ Review Vendors</button>
        `;

        fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function formatShortDate(d) {
    return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
}

function calculateProgress(b) {
    return {
        planning: 20,
        pending: 40,
        confirmed: 80,
        completed: 100,
        cancelled: 0
    }[b.status] || 0;
}

function getStatusText(status) {
    return {
        planning: 'Planning Phase',
        pending: 'Vendor Selection Pending',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled'
    }[status] || status;
}

function completeBooking(id) {
    sessionStorage.setItem('selectedBookingId', id);
    window.location.href = 'vendors_page.html';
}

function viewEventDetails(id) {
    alert("Event details coming soon. ID: " + id);
}

// ============== REVIEWS ==============
async function showReviewModal(bookingId) {
    try {
        const res = await window.fetchWithAuth(`/bookings/${bookingId}`);
        const booking = await res.json();
        
        if (!booking.items || booking.items.length === 0) {
            return showError("No vendors found for this booking.");
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        let itemsHtml = booking.items.map(item => `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 8px;">
                <h4>Vendor: ${item.vendor_name || 'Unknown'}</h4>
                <p>Service: ${item.service_title || ''}</p>
                
                <div class="form-group" style="margin-top: 10px;">
                    <label>Rating (1-5)</label>
                    <input type="number" min="1" max="5" id="rating-${item.id}" required>
                </div>
                <div class="form-group">
                    <label>Comment</label>
                    <textarea id="comment-${item.id}" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Add Media (Images/Videos, Max 5)</label>
                    <input type="file" id="media-${item.id}" multiple accept="image/*,video/*">
                </div>
                <button type="button" onclick="submitReview('${item.id}')" style="background:#f39c12; color:white; padding:8px 15px; border:none; border-radius:5px; cursor:pointer;">Submit Review</button>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-height:80vh; overflow-y:auto;">
                <div class="modal-header">
                    <h3>Review Vendors</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div style="padding: 10px 0;">
                    ${itemsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.modal-close').onclick = close;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

    } catch (err) {
        showError("Failed to fetch booking details for review");
    }
}

async function submitReview(itemId) {
    const rating = document.getElementById(`rating-${itemId}`).value;
    const comment = document.getElementById(`comment-${itemId}`).value;
    
    if(!rating || rating < 1 || rating > 5) return showError("Please provide a rating between 1 and 5.");

    try {
        const res = await window.fetchWithAuth('/reviews', {
            method: 'POST',
            body: JSON.stringify({
                booking_item_id: itemId,
                rating: parseInt(rating),
                comment: comment
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to submit review');
        }
        
        const review = await res.json();
        const reviewId = review.id;

        // Handle Media Upload if selected
        const mediaInput = document.getElementById(`media-${itemId}`);
        if(mediaInput && mediaInput.files.length > 0) {
            const mediaFormData = new FormData();
            for(let i=0; i < Math.min(mediaInput.files.length, 5); i++) {
                mediaFormData.append('files', mediaInput.files[i]);
            }

            const mediaRes = await window.fetchWithAuth(`/reviews/${reviewId}/media`, {
                method: 'POST',
                body: mediaFormData
            });

            if(!mediaRes.ok) {
                showError("Review saved, but media upload failed.");
            }
        }
        
        showSuccess("Review submitted successfully!");
        document.getElementById(`rating-${itemId}`).closest('div').innerHTML = '<p style="color:green">Review Submitted ✅</p>';
    } catch(e) {
        showError(e.message || "Failed to submit review. Have you already reviewed this vendor?");
    }
}
// =====================================

// ============== RECOMMENDATIONS / EDIT DATES ==============
async function showEditDatesModal(bookingId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Event Dates</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form id="editDatesForm">
                <p style="font-size:13px; color:#666; margin-bottom:15px;">Warning: Changing dates may cause vendor conflicts. Our Smart Recommendation engine will suggest alternatives if needed!</p>
                <div class="form-group">
                    <label>New Start Date *</label>
                    <input type="datetime-local" name="event_start" required>
                </div>
                <div class="form-group">
                    <label>New End Date *</label>
                    <input type="datetime-local" name="event_end" required>
                </div>
                <button type="submit" style="background:#3498db; color:white; width:100%; padding:10px; border:none; border-radius:5px;">Update Dates</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.modal-close').onclick = close;

    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        try {
            const res = await window.fetchWithAuth(`/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_start: fd.get('event_start'),
                    event_end: fd.get('event_end')
                })
            });

            const data = await res.json();
            close();
            
            if (!res.ok) throw new Error(data.message || 'Failed to update');

            if (data.suggestions && data.suggestions.length > 0) {
                // Show Recommendations UI
                showRecommendationsUI(data.suggestions);
            } else {
                showSuccess("Dates updated successfully (No vendor conflicts!)");
            }
            loadUserEvents();
            
        } catch (err) {
            showError("Failed to update dates: " + err.message);
        }
    });
}

function showRecommendationsUI(suggestions) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const recsHtml = suggestions.map(rec => `
        <div style="border: 2px dashed #f39c12; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
            <h4 style="color: #f39c12;">💡 Recommended Alternative: ${rec.full_name}</h4>
            <p><strong>Rating:</strong> ⭐ ${rec.average_rating} | <strong>Price Diff:</strong> ~₹${rec.price}</p>
            <p style="font-size:12px; color:#555;">Because your previous vendor was busy on the new dates, we highly recommend this vendor with a ${(rec.price_proximity_score * 100).toFixed(0)}% match score!</p>
            <button onclick="window.location.href='vendors_page.html'" style="margin-top:10px; background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:4px;">Book Now</button>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-height:80vh; overflow-y:auto; border-top: 5px solid #f39c12;">
            <div class="modal-header">
                <h3>Vendor Conflicts Detected</h3>
                <button class="modal-close">&times;</button>
            </div>
            <p>Some of your originally booked vendors are not available on your new dates. Our AI has found amazing alternatives:</p>
            <div style="margin-top: 20px;">
                ${recsHtml}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
}
// ==========================================================

/* ✅ RESTORED CREATE EVENT MODAL */
function showCreateEventModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.animation = 'fadeIn 0.3s ease';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px; transform: scale(0.9); animation: modalIn 0.3s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div class="modal-header" style="background:#fdf5e6;">
                <h3 style="display:flex; align-items:center; gap:10px;">✨ Create New Event</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form id="createEventForm" style="padding:2rem;">
                <div class="form-group">
                    <label>📝 Event Title *</label>
                    <input type="text" name="title" placeholder="e.g. Rahul's Grand Wedding" required>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                    <div class="form-group">
                        <label>📅 Start Date & Time *</label>
                        <input type="datetime-local" name="event_start" required>
                    </div>
                    <div class="form-group">
                        <label>⌛ End Date & Time *</label>
                        <input type="datetime-local" name="event_end" required>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.5fr 0.5fr; gap:1.5rem;">
                    <div class="form-group">
                        <label>📍 Venue / Location</label>
                        <input type="text" name="location" placeholder="City, Hall, or TBD">
                    </div>
                    <div class="form-group">
                        <label>👥 Guests</label>
                        <input type="number" name="guest_count" min="1" value="50">
                    </div>
                </div>

                <div class="form-actions" style="border-top: 1px solid #eee; padding-top:1.5rem; margin-top:1rem;">
                    <button type="button" id="cancelBtn" class="btn-secondary">Dismiss</button>
                    <button type="submit" class="btn-complete" style="width:auto; padding:10px 40px; border-radius:30px;">Launch Event 🚀</button>
                </div>
            </form>
        </div>
    `;

    // Add extra animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);

    const close = () => {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.2s';
        setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector('.modal-close').onclick = close;
    modal.querySelector('#cancelBtn').onclick = close;

    modal.addEventListener('click', e => {
        if (e.target === modal) close();
    });

    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = "Creating...";
        btn.disabled = true;

        const fd = new FormData(e.target);
        
        const start = new Date(fd.get('event_start'));
        const end = new Date(fd.get('event_end'));
        
        if (end <= start) {
            btn.textContent = originalText;
            btn.disabled = false;
            return showError("Oops! Event end time must be after the start time.");
        }

        try {
            await createEvent(fd);
            close();
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

async function createEvent(formData) {
    try {
        const data = {
            title: formData.get('title'),
            event_start: formData.get('event_start'),
            event_end: formData.get('event_end'),
            location: formData.get('location'),
            guest_count: parseInt(formData.get('guest_count')) || 0
        };

        const res = await window.fetchWithAuth('/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            if (res.status === 401) {
                throw new Error("Session expired. Please login again.");
            }
            if (error.message.includes('bookings_check')) {
                throw new Error("Validation Error: Event end time must be after the start time.");
            }
            throw new Error(error.message || "Failed to create event");
        }

        showSuccess("Event created!");

        loadUserEvents();

    } catch (err) {
        showError(err.message || "Failed to create event");
    }
}

function showSuccess(msg) {
    notify(msg, 'success');
}

function showError(msg) {
    notify(msg, 'error');
}

function notify(msg, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}
