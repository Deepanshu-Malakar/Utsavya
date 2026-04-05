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

    const img = document.createElement('img');
    img.src = "../images/caterging.jpg";
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

    const btn = body.children[5];
    btn.textContent = "Complete Booking";
    btn.dataset.bookingId = b.id;
}

function renderUpcomingEvents(bookings) {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;

    const fragment = document.createDocumentFragment();

    bookings.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';

        div.innerHTML = `
            <span>${formatShortDate(b.event_start)}</span>
            <span>${b.title}</span>
            <span>📍 ${b.location || 'TBD'}</span>
            <button class="btn-outline btn-edit-dates" data-booking-id="${b.id}" style="border-color: #3498db; color: #3498db; padding: 5px 10px; font-size: 13px;">📅 Edit Dates</button>
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

        div.innerHTML = `
            <span>${formatShortDate(b.event_start)}</span>
            <span>${b.title}</span>
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
        const res = await window.fetchWithAuth(`/bookings/items/${itemId}/complete`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
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

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create New Event</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form id="createEventForm">
                <div class="form-group">
                    <label>Event Title *</label>
                    <input type="text" name="title" required>
                </div>
                <div class="form-group">
                    <label>Start *</label>
                    <input type="datetime-local" name="event_start" required>
                </div>
                <div class="form-group">
                    <label>End *</label>
                    <input type="datetime-local" name="event_end" required>
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location">
                </div>
                <div class="form-group">
                    <label>Guest Count</label>
                    <input type="number" name="guest_count" min="1" value="0">
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelBtn">Cancel</button>
                    <button type="submit">Create Event</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    modal.querySelector('.modal-close').onclick = close;
    modal.querySelector('#cancelBtn').onclick = close;

    modal.addEventListener('click', e => {
        if (e.target === modal) close();
    });

    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        // Manual validation before sending
        const start = new Date(fd.get('event_start'));
        const end = new Date(fd.get('event_end'));
        
        if (end <= start) {
            return showError("Event end time must be after the start time.");
        }

        await createEvent(fd);
        close();
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