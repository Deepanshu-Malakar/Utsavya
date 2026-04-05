// Tab switching functionality
function showRequestsTab() {
    ['requestsSection', 'servicesSection', 'profileCardSection'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById('requestsSection').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabRequests').classList.add('active');
}

function showServicesTab() {
    ['requestsSection', 'servicesSection', 'profileCardSection'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById('servicesSection').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabServices').classList.add('active');
    loadServices();
}

function showProfileCardTab() {
    ['requestsSection', 'servicesSection', 'profileCardSection'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById('profileCardSection').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabProfileCard').classList.add('active');
    loadProfileCardData();
}

// Load vendor services
async function loadServices() {
    try {
        const response = await window.fetchWithAuth('/services/vendor');

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
document.getElementById('addServiceForm').addEventListener('submit', async function(e) {
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
        loadServices(); // Refresh the services list
    } catch (error) {
        console.error('Error adding service:', error);
        alert('Failed to add service. Please try again.');
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
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
    if(!container) return;

    try {
        const response = await fetch(`/services/${serviceId}/media`);
        if(!response.ok) return;

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
    } catch(e) {
        console.error(e);
    }
}

async function deleteServiceMedia(mediaId, serviceId) {
    if(!confirm("Are you sure you want to delete this media?")) return;

    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        const response = await fetch(`/services/media/${mediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if(response.ok) {
            fetchServiceMedia(serviceId); // reload
        } else {
            alert("Failed to delete media.");
        }
    } catch(e) {
        console.error(e);
        alert("Error deleting media.");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Show requests tab by default
    showRequestsTab();
    loadBookingRequests();
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
        renderRequests(requests);
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
        // If the request isn't pending, maybe different styling or hide it
        const isPending = req.status === 'pending';
        return `
        <div class="vendor-card">
            <div class="vendor-details" style="padding-left: 20px;">
                <h3>Event: ${req.event_title || 'Untitled Event'}</h3>
                <div class="category">Customer: ${req.customer_name}</div>
                
                <div class="description">
                    Booking Date: ${new Date(req.event_start).toLocaleString()}<br>
                    Status: <strong>${req.status.toUpperCase()}</strong>
                </div>

                <div class="vendor-footer">
                    <span class="price">Service: ${req.service_title || 'General'}</span>
                    ${isPending ? `
                    <div class="action-buttons">
                        <button class="accept-btn" onclick="updateRequestStatus('${req.id}', 'accepted')">Accept</button>
                        <button class="reject-btn" onclick="updateRequestStatus('${req.id}', 'rejected')" style="background: #e74c3c; color: white;">Reject</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function updateRequestStatus(itemId, status) {
    try {
        const response = await window.fetchWithAuth(`/vendors/booking-requests/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
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
async function loadProfileCardData() {
    try {
        const res = await window.fetchWithAuth('/auth/profile');
        if (!res.ok) return;
        const data = await res.json();
        const user = data.data || data;

        document.getElementById('previewName').textContent = user.full_name || 'Your Name';

        if (user.profile_image) {
            document.getElementById('previewImage').src = user.profile_image;
            document.getElementById('editProfileImage').value = user.profile_image;
        }
        if (user.tagline) {
            document.getElementById('editTagline').value = user.tagline;
            document.getElementById('previewTagline').textContent = user.tagline;
        }

        // Load services to show category + price
        const svcRes = await window.fetchWithAuth('/services/vendor');
        if (svcRes.ok) {
            const services = await svcRes.json();
            const svcArr = Array.isArray(services) ? services : (services.data || []);
            if (svcArr.length > 0) {
                const categories = svcArr.slice(0, 2).map(s => s.title).join(', ');
                document.getElementById('previewCategory').textContent = '🏷️ ' + categories;

                const city = svcArr[0]?.city || '';
                if (city) document.getElementById('previewCity').textContent = '📍 ' + city;

                const minPrice = Math.min(...svcArr.map(s => parseFloat(s.price) || 0));
                if (minPrice > 0) {
                    document.getElementById('previewPrice').textContent = '₹' + minPrice.toLocaleString('en-IN') + '+';
                }
            }
        }
    } catch (e) {
        console.error('Error loading profile card data:', e);
    }
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
    const tagline = document.getElementById('editTagline').value.trim();
    const imageUrl = document.getElementById('editProfileImage').value.trim();
    const fileInput = document.getElementById('editProfileImageFile');
    const statusEl = document.getElementById('saveCardStatus');
    const btn = document.querySelector('.save-card-btn');

    btn.disabled = true;
    btn.textContent = 'Saving...';
    statusEl.textContent = '';

    try {
        // If a file was chosen, upload it first
        let finalImageUrl = imageUrl;
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            const uploadRes = await window.fetchWithAuth('/auth/profile/image', {
                method: 'POST',
                body: formData,
                headers: {} // Don't set Content-Type; browser handles multipart boundary
            });
            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                finalImageUrl = uploadData.url || uploadData.profile_image || finalImageUrl;
            }
        }

        // Save tagline and image URL via profile PATCH
        const payload = {};
        if (tagline) payload.tagline = tagline;
        if (finalImageUrl) payload.profile_image = finalImageUrl;

        const res = await window.fetchWithAuth('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Save failed');

        statusEl.style.color = '#27ae60';
        statusEl.textContent = '✅ Profile card updated! Customers will see these changes immediately.';
        showVendorNotification('Profile card saved!', 'success');

        // Update preview
        if (finalImageUrl) document.getElementById('previewImage').src = finalImageUrl;
        if (tagline) document.getElementById('previewTagline').textContent = tagline;

    } catch (err) {
        statusEl.style.color = '#e53935';
        statusEl.textContent = '❌ Could not save changes. Please try again.';
        showVendorNotification('Save failed.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}

function showVendorNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;bottom:25px;right:25px;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:500;color:white;z-index:9999;box-shadow:0 8px 25px rgba(0,0,0,0.2);animation:slideNotifIn 0.4s ease;background:${type==='error'?'#e53935':'#27ae60'};`;
    n.textContent = msg;
    const style = document.createElement('style');
    style.textContent = '@keyframes slideNotifIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}