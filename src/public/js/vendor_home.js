// Tab switching functionality
const ALL_TABS = ['homeSection', 'servicesSection', 'scheduleSection', 'memoriesSection', 'profileCardSection'];
const ALL_TAB_BTNS = ['navHome', 'navServices', 'navSchedule', 'navMemories', 'navProfileCard'];

let currentDate = new Date();
let allRequests = [];

function switchTab(activeSectionId, activeBtnId) {
    ALL_TABS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    ALL_TAB_BTNS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const activeSection = document.getElementById(activeSectionId);
    if (activeSection) activeSection.classList.add('active');
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');
}

function showHomeTab() {
    switchTab('homeSection', 'navHome');
    loadBookingRequests();
}

// ================= CALENDAR LOGIC =================
function renderCalendar() {
    const monthYear = document.getElementById("monthYear");
    const calendarDates = document.getElementById("calendarDates");
    if (!monthYear || !calendarDates) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
    calendarDates.innerHTML = "";

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        calendarDates.innerHTML += '<div class="empty"></div>';
    }

    // Dates for current month
    for (let i = 1; i <= lastDate; i++) {
        const dateDiv = document.createElement("div");
        dateDiv.textContent = i;
        
        const fullDate = new Date(year, month, i);
        const dateStr = fullDate.toDateString();

        // Check if this date has any bookings
        const bookingsOnDate = allRequests.filter(req => {
            const reqDate = new Date(req.event_start).toDateString();
            return reqDate === dateStr;
        });

        if (bookingsOnDate.length > 0) {
            const hasAccepted = bookingsOnDate.some(r => r.status === 'accepted');
            dateDiv.classList.add('has-event');
            if (hasAccepted) dateDiv.classList.add('accepted');
            
            // Add a small indicator dot
            const dot = document.createElement('span');
            dot.className = 'event-dot';
            dateDiv.appendChild(dot);
            
            dateDiv.title = bookingsOnDate.map(r => `${r.event_title} (${r.status})`).join('\n');
        }

        // Highlight today
        if (dateStr === new Date().toDateString()) {
            dateDiv.classList.add('today');
        }

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

function showServicesTab() {
    switchTab('servicesSection', 'navServices');
    loadServices();
}

function showScheduleTab() {
    switchTab('scheduleSection', 'navSchedule');
    loadSchedule();
    loadBlockedDates();
}

function showMemoriesTab() {
    switchTab('memoriesSection', 'navMemories');
    loadCompletedBookingOptions();
    loadVendorMemories();
}

function showProfileCardTab() {
    switchTab('profileCardSection', 'navProfileCard');
    loadProfileCardData();
}

// Load vendor services
async function loadServices() {
    try {
        const response = await window.fetchWithAuth('/services/vendor');

        if (response.status === 403) {
            document.getElementById('servicesGrid').innerHTML = '<div class="error" style="color:#e53935;padding:20px;background:#ffebee;border-radius:8px;">🔒 Access Denied: You do not have permission to view these services. Please contact support if you are a verified vendor.</div>';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load services');
        }

        const services = await response.json();
        const svcArr = Array.isArray(services) ? services : (services.data || []);
        renderServices(svcArr);
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesGrid').innerHTML = '<div class="error">Failed to load services. Please try again.</div>';
    }
}

// Render services
function renderServices(services) {
    const servicesGrid = document.getElementById('servicesGrid');

    if (services.length === 0) {
        servicesGrid.innerHTML = '<div class="no-services">You haven\'t added any services yet. Click "Add New Service" to get started.</div>';
        return;
    }

    const servicesHTML = services.map(service => `
        <div class="service-card">
            <h3>${service.title}</h3>
            <p class="description">${service.description}</p>
            <div class="price">₹${parseInt(service.price).toLocaleString()}</div>
            <div class="city">📍 ${service.city}</div>
            <div class="status ${service.is_active ? 'active' : 'inactive'}">
                ${service.is_active ? 'Active' : 'Inactive'}
            </div>
            
            <!-- MEDIA UPLOAD SECTION -->
            <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-size: 13px; color: #666; display:block; margin-bottom:5px;">Upload Service Media (Video/Image):</label>
                <input type="file" id="media-upload-${service.id}" accept="video/*,image/*" style="font-size: 12px; margin-bottom: 5px;">
                <button onclick="uploadServiceMedia('${service.id}')" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;">Upload</button>
            </div>

            <!-- MEDIA DISPLAY SECTION -->
            <div id="media-display-${service.id}" style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
                <!-- Media will be loaded here -->
            </div>
        </div>
    `).join('');

    servicesGrid.innerHTML = servicesHTML;

    // Load media for each service
    services.forEach(s => fetchServiceMedia(s.id));
}

// Modal functionality
function showAddServiceModal() {
    document.getElementById('addServiceModal').style.display = 'flex';
}

function closeAddServiceModal() {
    document.getElementById('addServiceModal').style.display = 'none';
    document.getElementById('addServiceForm').reset();
}

// Handle form submission
document.getElementById('addServiceForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert('Please log in to add services');
        return;
    }

    const formData = {
        title: document.getElementById('serviceTitle').value,
        description: document.getElementById('serviceDescription').value,
        city: document.getElementById('serviceCity').value,
        price: parseInt(document.getElementById('servicePrice').value),
        price_type: document.getElementById('priceType').value
    };

    try {
        const response = await fetch('/services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to add service');
        }

        const result = await response.json();
        alert('Service added successfully!');
        closeAddServiceModal();
        if (typeof loadServices === 'function') loadServices(); // Refresh the services list
        if (typeof loadProfileCardData === 'function') loadProfileCardData(); // Refresh the profile card dropdown too
    } catch (error) {
        console.error('Error adding service:', error);
        alert('Failed to add service. Please try again.');
    }
});

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('addServiceModal');
    if (event.target === modal) {
        closeAddServiceModal();
    }
});

// MEDIA UPLOAD FUNCTIONALITY
async function uploadServiceMedia(serviceId) {
    const fileInput = document.getElementById(`media-upload-${serviceId}`);
    if (!fileInput.files.length) return alert("Please select a file first.");

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');

        const response = await fetch(`/services/${serviceId}/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            alert('Media uploaded successfully!');
            fileInput.value = ""; // clear input
            fetchServiceMedia(serviceId); // reload media
        } else {
            const data = await response.json();
            alert('Failed to upload media: ' + (data.message || 'Error'));
        }
    } catch (err) {
        console.error(err);
        alert('Error uploading media. Please try again.');
    }
}

async function fetchServiceMedia(serviceId) {
    const container = document.getElementById(`media-display-${serviceId}`);
    if (!container) return;

    try {
        const response = await fetch(`/services/${serviceId}/media`);
        if (!response.ok) return;

        const data = await response.json();
        const mediaItems = Array.isArray(data) ? data : (data.media || []);

        container.innerHTML = mediaItems.map(item => `
            <div style="position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; background: #eee;">
                ${item.media_type === 'video'
                ? `<video src="${item.media_url}" style="width:100%; height:100%; object-fit:cover;"></video>`
                : `<img src="${item.media_url}" style="width:100%; height:100%; object-fit:cover;">`
            }
                <button onclick="deleteServiceMedia('${item.id}', '${serviceId}')" 
                    style="position: absolute; top: 0; right: 0; background: rgba(231, 76, 60, 0.8); color: white; border: none; width: 20px; height: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    &times;
                </button>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function deleteServiceMedia(mediaId, serviceId) {
    if (!confirm("Are you sure you want to delete this media?")) return;

    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        const response = await fetch(`/services/media/${mediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            fetchServiceMedia(serviceId); // reload
        } else {
            alert("Failed to delete media.");
        }
    } catch (e) {
        console.error(e);
        alert("Error deleting media.");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    // Show home tab by default
    showHomeTab();
    
    // Initialize Schedule Form
    const availForm = document.getElementById('availabilityForm');
    if (availForm) {
        availForm.addEventListener('submit', handleAvailabilitySubmit);
    }

    // Initialize Memories
    const addMemoryBtn = document.getElementById('addMemoryBtn');
    if (addMemoryBtn) {
        addMemoryBtn.addEventListener('click', handleAddMemory);
    }
});

async function loadBookingRequests() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch('/vendors/booking-requests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load requests');

        const requests = await response.json();
        allRequests = Array.isArray(requests) ? requests : [];
        renderRequests(allRequests);
        renderCalendar();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('requestCardsContainer').innerHTML = '<div class="error">Failed to load requests.</div>';
    }
}

function renderRequests(requests) {
    const container = document.getElementById('requestCardsContainer');

    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="no-services" style="grid-column: 1/-1;">No pending booking requests right now.</div>';
        return;
    }

    container.innerHTML = requests.map(req => {
        const isPending = req.status === 'pending';
        // Pick an icon based on service title or just a default
        const icon = (req.service_title || '').toLowerCase().includes('photo') ? '📸' : 
                     (req.service_title || '').toLowerCase().includes('catering') ? '🍱' : '🎉';

        return `
        <div class="vendor-card horizontal-request">
            <div class="request-icon">${icon}</div>
            <div class="vendor-details">
                <div class="info-main">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                        <h3 style="margin:0; font-size:20px;">${req.event_title || 'Untitled Event'}</h3>
                        <span class="status-tag ${req.status}">${req.status.toUpperCase()}</span>
                    </div>
                    <div class="category" style="font-size:14px; margin-bottom:4px;">👤 Customer: <strong>${req.customer_name || 'Anonymous'}</strong></div>
                    <div class="service-name" style="font-size:13px; color:#666;">🛠️ Service: ${req.service_title || 'General'}</div>
                    
                    <div class="request-date-box" style="margin-top:12px; display:flex; gap:15px; font-size:13px; color:#444;">
                        <span>📅 ${new Date(req.event_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>🕒 ${new Date(req.event_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                <div class="info-side">
                    <div class="price" style="font-size:22px; margin-bottom:15px;">₹${(parseInt(req.price_quote) || 0).toLocaleString()}</div>
                    ${isPending ? `
                    <div class="action-buttons" style="display:flex; flex-direction:column; gap:8px; width:100%;">
                        <button class="accept-btn" style="width:100%; padding:8px;" onclick="updateRequestStatus('${req.id}', 'accepted', '${req.price_quote || 0}')">Accept Request</button>
                        <button class="reject-btn" style="width:100%; padding:6px; background:#fdf2f2; color:#e74c3c; border:1px solid #ffcdd2; border-radius:4px; font-size:12px; cursor:pointer;" onclick="updateRequestStatus('${req.id}', 'rejected')">Decline</button>
                    </div>
                    ` : `
                    <div style="font-size:12px; color:#888; text-align:right;">
                        Request was <strong>${req.status}</strong><br>
                        on ${new Date(req.updated_at).toLocaleDateString()}
                    </div>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join('');
}



async function updateRequestStatus(itemId, status, currentPrice = 0) {
    let price_quote = currentPrice;

    if (status === 'accepted') {
        const input = window.prompt(`Confirm or update your price quote for this event (₹):`, currentPrice);
        if (input === null) return; // User cancelled
        price_quote = parseFloat(input) || currentPrice;
        if (isNaN(price_quote)) price_quote = currentPrice;
    }

    try {
        const response = await window.fetchWithAuth(`/vendors/booking-requests/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, price_quote })
        });

        if (!response.ok) throw new Error('Failed to update status');

        showVendorNotification(`Booking request ${status}!`, 'success');
        loadBookingRequests();
    } catch (error) {
        console.error('Error:', error);
        showVendorNotification('Could not update request status.', 'error');
    }
}

// ===== PROFILE CARD TAB =====
let vendorServices = [];

async function loadProfileCardData() {
    try {
        const res = await window.fetchWithAuth('/auth/profile');
        if (!res.ok) return;
        const data = await res.json();
        const user = data.data || data;

        document.getElementById('previewName').textContent = user.full_name || 'Your Name';
        if (user.profile_image) {
            document.getElementById('previewImage').src = user.profile_image;
        }

        // Load services for dropdown
        const svcRes = await window.fetchWithAuth('/services/vendor');
        const dropdown = document.getElementById('selectServiceForCard');
        
        if (svcRes.ok) {
            const services = await svcRes.json();
            vendorServices = Array.isArray(services) ? services : (services.data || []);
            
            if (vendorServices.length === 0) {
                dropdown.innerHTML = '<option value="">No services available. Create one first!</option>';
            } else {
                dropdown.innerHTML = '<option value="">Select a service to customize...</option>' + 
                    vendorServices.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
                
                // Load first service if none selected
                if (!dropdown.value && vendorServices.length > 0) {
                    loadServiceCardDetails(vendorServices[0].id);
                    dropdown.value = vendorServices[0].id;
                }
            }
        } else {
            console.error('Failed to load services for dropdown:', svcRes.status);
            if (svcRes.status === 403) {
                dropdown.innerHTML = '<option value="">🔒 Access Denied (403)</option>';
                showVendorNotification('Permission denied while loading services.', 'error');
            } else {
                dropdown.innerHTML = '<option value="">Error loading services.</option>';
            }
        }
    } catch (e) {
        console.error('Error loading profile card data:', e);
        const dropdown = document.getElementById('selectServiceForCard');
        if (dropdown) dropdown.innerHTML = '<option value="">Error loading data.</option>';
    }
}

function updateLivePreview() {
    const title = document.getElementById('editServiceTitle').value;
    const tagline = document.getElementById('editTagline').value;
    const price = document.getElementById('editServicePrice').value;
    const city = document.getElementById('editServiceCity').value;
    const image = document.getElementById('editServiceImage').value;

    document.getElementById('previewName').textContent = title || 'Your Service';
    document.getElementById('previewTagline').textContent = tagline || 'Your tagline...';
    document.getElementById('previewPrice').textContent = price ? '₹' + (parseInt(price) || 0).toLocaleString() : '₹–';
    document.getElementById('previewCity').textContent = city ? '📍 ' + city : '📍 Your City';
    
    if (image) {
        document.getElementById('previewImage').src = image;
    }
}

function loadServiceCardDetails(serviceId) {
    if (!serviceId) {
        document.getElementById('editServiceTitle').value = '';
        document.getElementById('editTagline').value = '';
        document.getElementById('editServicePrice').value = '';
        document.getElementById('editServiceCity').value = '';
        document.getElementById('editServiceImage').value = '';
        updateLivePreview();
        return;
    }

    const service = vendorServices.find(s => s.id === serviceId);
    if (!service) return;

    // Update inputs
    document.getElementById('editServiceTitle').value = service.title || '';
    document.getElementById('editTagline').value = service.tagline || '';
    document.getElementById('editServicePrice').value = service.price || '';
    document.getElementById('editServiceCity').value = service.city || '';
    document.getElementById('editServiceImage').value = service.service_image_url || '';

    updateLivePreview();
}

function previewUploadedImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('previewImage').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveProfileCard() {
    const serviceId = document.getElementById('selectServiceForCard').value;
    if (!serviceId) return alert('Please select a service.');

    const payload = {
        title: document.getElementById('editServiceTitle').value.trim(),
        tagline: document.getElementById('editTagline').value.trim(),
        price: parseInt(document.getElementById('editServicePrice').value),
        city: document.getElementById('editServiceCity').value.trim()
    };

    const btn = document.querySelector('.save-card-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await window.fetchWithAuth(`/services/${serviceId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showVendorNotification('Profile card updated!', 'success');
            // Update local state
            const sIdx = vendorServices.findIndex(s => s.id === serviceId);
            if (sIdx > -1) vendorServices[sIdx] = { ...vendorServices[sIdx], ...payload };
        } else {
            throw new Error('Save failed');
        }
    } catch (err) {
        showVendorNotification('Failed to save profile card.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Card Changes';
    }
}

// ===== SCHEDULE TAB LOGIC =====
async function loadSchedule() {
    const grid = document.getElementById('scheduleGrid');
    try {
        const res = await window.fetchWithAuth('/vendors/booking-requests');
        if (!res.ok) throw new Error('Load failed');
        const bookings = await res.json();
        const upcoming = (Array.isArray(bookings) ? bookings : []).filter(b => b.status === 'accepted');
        
        if (upcoming.length === 0) {
            grid.innerHTML = '<div class="no-services" style="grid-column: 1/-1;">No upcoming bookings.</div>';
            return;
        }

        grid.innerHTML = upcoming.map(item => `
            <div class="service-card">
                <h3>${item.booking_title || item.title || 'Event'}</h3>
                <div style="font-size:14px; color:#666; margin-bottom:10px;">📅 ${new Date(item.event_start).toLocaleString()}</div>
                <div style="font-size:13px; color:#888;">👤 Customer: ${item.customer_name || 'Customer'}</div>
                <button class="accept-btn" style="margin-top:15px;" onclick="completeBooking('${item.id}')">Mark Completed</button>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="error">Failed to load schedule.</div>';
    }
}

async function loadBlockedDates() {
    const list = document.getElementById('blockedDatesList');
    try {
        const profRes = await window.fetchWithAuth('/auth/profile');
        const profData = await profRes.json();
        const userId = profData.data?.id || profData.id;

        const res = await fetch(`/vendors/${userId}/availability`);
        if (!res.ok) return;
        const data = await res.json();
        const blocks = Array.isArray(data) ? data : (data.blocks || []);

        if (blocks.length === 0) {
            list.innerHTML = '<p style="font-size:12px; color:#888;">No dates blocked.</p>';
            return;
        }

        list.innerHTML = blocks.map(block => `
            <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:13px;">${block.reason || 'Blocked'}</strong><br>
                    <small style="color:#666; font-size:11px;">${new Date(block.start_time).toLocaleDateString()} - ${new Date(block.end_time).toLocaleDateString()}</small>
                </div>
                <button style="border:none; background:none; color:#e74c3c; cursor:pointer;" onclick="removeBlock('${block.id}', '${userId}')">&times;</button>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function handleAvailabilitySubmit(e) {
    e.preventDefault();
    const start_time = document.getElementById('blockStart').value;
    const end_time = document.getElementById('blockEnd').value;
    const reason = document.getElementById('blockReason').value;

    try {
        const profRes = await window.fetchWithAuth('/auth/profile');
        const profData = await profRes.json();
        const userId = profData.data?.id || profData.id;

        const res = await fetch(`/vendors/${userId}/availability`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ start_time, end_time, reason })
        });
        if (res.ok) {
            showVendorNotification('Dates blocked!');
            document.getElementById('availabilityForm').reset();
            loadBlockedDates();
        }
    } catch (err) { console.error(err); }
}

window.removeBlock = async (blockId, userId) => {
    if (!confirm('Remove block?')) return;
    try {
        const res = await fetch(`/vendors/${userId}/availability/${blockId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (res.ok) loadBlockedDates();
    } catch (err) { console.error(err); }
};

window.completeBooking = async (itemId) => {
    if (!confirm('Confirm completion?')) return;
    try {
        const res = await window.fetchWithAuth(`/bookings/items/${itemId}/complete`, { method: 'PATCH' });
        if (res.ok) {
            showVendorNotification('Booking completed!');
            loadSchedule();
        }
    } catch (e) { console.error(e); }
};

// ===== MEMORIES TAB LOGIC =====
async function loadCompletedBookingOptions() {
    const select = document.getElementById('memoryBookingSelect');
    if (!select) return;

    try {
        const res = await window.fetchWithAuth('/bookings/vendor/completed-items');
        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : (payload.data || []);

        if (!res.ok) {
            throw new Error(payload.message || 'Failed to load completed bookings');
        }

        if (items.length === 0) {
            select.innerHTML = '<option value="">No completed bookings available</option>';
            return;
        }

        select.innerHTML = '<option value="">Select completed event</option>' + items.map(item => {
            const eventDate = item.event_start ? new Date(item.event_start).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) : 'Date pending';
            return `<option value="${item.id}">${item.event_title || 'Event'} - ${item.customer_name || 'Customer'} - ${item.service_title || 'Service'} (${eventDate})</option>`;
        }).join('');
    } catch (error) {
        console.error('Error loading completed bookings:', error);
        select.innerHTML = '<option value="">Error loading completed bookings</option>';
    }
}

function renderVendorMemories(memories) {
    const grid = document.getElementById('memoriesGrid');
    if (!grid) return;

    if (!memories || memories.length === 0) {
        grid.innerHTML = '<div class="no-services" style="grid-column: 1/-1;">No event memories uploaded yet.</div>';
        return;
    }

    grid.innerHTML = memories.map(memory => {
        const eventDate = memory.event_start ? new Date(memory.event_start).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : '';

        return `
            <div class="service-card" style="position:relative; overflow:hidden;">
                <div style="height:180px; background:#f4f4f4; border-radius:10px; overflow:hidden; margin-bottom:14px;">
                    ${memory.media_type === 'video'
                        ? `<video src="${memory.media_url}" controls style="width:100%; height:100%; object-fit:cover;"></video>`
                        : `<img src="${memory.media_url}" alt="${memory.event_title || 'Memory'}" style="width:100%; height:100%; object-fit:cover;">`
                    }
                </div>
                <div style="font-weight:700; color:#333; margin-bottom:6px;">${memory.event_title || 'Event Memory'}</div>
                <div style="font-size:13px; color:#666; margin-bottom:4px;">Customer: ${memory.customer_name || 'Customer'}</div>
                <div style="font-size:13px; color:#666; margin-bottom:4px;">Service: ${memory.service_title || 'Service'}</div>
                <div style="font-size:12px; color:#999;">${eventDate}${memory.location ? ` • ${memory.location}` : ''}</div>
                <button onclick="deleteVendorMemory('${memory.id}')" style="position:absolute; top:12px; right:12px; border:none; background:rgba(231,76,60,0.9); color:#fff; width:28px; height:28px; border-radius:50%; cursor:pointer;">&times;</button>
            </div>
        `;
    }).join('');
}

async function loadVendorMemories() {
    const grid = document.getElementById('memoriesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading" style="grid-column: 1/-1;">Loading memories...</div>';

    try {
        const res = await window.fetchWithAuth('/bookings/vendor/memories');
        const payload = await res.json();
        const memories = Array.isArray(payload) ? payload : (payload.data || []);

        if (!res.ok) {
            throw new Error(payload.message || 'Failed to load memories');
        }

        renderVendorMemories(memories);
    } catch (error) {
        console.error('Error loading vendor memories:', error);
        grid.innerHTML = '<div class="error" style="grid-column: 1/-1;">Failed to load memories.</div>';
    }
}

async function handleAddMemory() {
    const bookingItemId = document.getElementById('memoryBookingSelect').value;
    const filesInput = document.getElementById('memoryFiles');
    const files = Array.from(filesInput?.files || []);

    if (!bookingItemId) {
        alert('Please select a completed booking first.');
        return;
    }

    if (files.length === 0) {
        alert('Please choose at least one image or video.');
        return;
    }

    const formData = new FormData();
    files.slice(0, 10).forEach(file => formData.append('files', file));

    try {
        const res = await window.fetchWithAuth(`/bookings/items/${bookingItemId}/memories`, {
            method: 'POST',
            body: formData
        });
        const payload = await res.json();

        if (!res.ok) {
            throw new Error(payload.message || 'Failed to upload memories');
        }

        filesInput.value = '';
        showVendorNotification('Event memories sent to the customer.', 'success');
        loadVendorMemories();
    } catch (error) {
        console.error('Error uploading memories:', error);
        showVendorNotification(error.message || 'Failed to upload memories.', 'error');
    }
}

window.deleteVendorMemory = async (memoryId) => {
    if (!confirm('Delete this memory?')) return;

    try {
        const res = await window.fetchWithAuth(`/bookings/memories/${memoryId}`, {
            method: 'DELETE'
        });
        const payload = await res.json();

        if (!res.ok) {
            throw new Error(payload.message || 'Failed to delete memory');
        }

        showVendorNotification('Memory deleted.', 'success');
        loadVendorMemories();
    } catch (error) {
        console.error('Error deleting memory:', error);
        showVendorNotification(error.message || 'Failed to delete memory.', 'error');
    }
};

function showVendorNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;bottom:25px;right:25px;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:500;color:white;z-index:9999;box-shadow:0 8px 25px rgba(0,0,0,0.2);animation:slideNotifIn 0.4s ease;background:${type === 'error' ? '#e53935' : '#27ae60'};`;
    n.textContent = msg;
    if (!document.getElementById('notif-style')) {
        const style = document.createElement('style');
        style.id = 'notif-style';
        style.textContent = '@keyframes slideNotifIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
        document.head.appendChild(style);
    }
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}
