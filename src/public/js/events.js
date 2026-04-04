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
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');

        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/bookings', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

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
            <button class="btn-outline" data-booking-id="${b.id}">
                View Event Details
            </button>
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
        await createEvent(new FormData(e.target));
        close();
    });
}

async function createEvent(formData) {
    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');

        const data = {
            title: formData.get('title'),
            event_start: formData.get('event_start'),
            event_end: formData.get('event_end'),
            location: formData.get('location')
        };

        const res = await fetch('/bookings', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error();

        showSuccess("Event created!");

        loadUserEvents();

    } catch {
        showError("Failed to create event");
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