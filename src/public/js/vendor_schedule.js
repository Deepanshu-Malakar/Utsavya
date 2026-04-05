document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    if (!token) {
        alert('Please login as a vendor to access your schedule.');
        window.location.href = 'login2.html';
        return;
    }

    const vendorsGrid = document.getElementById('vendorsGrid');
    const blockedDatesList = document.getElementById('blockedDatesList');
    const availabilityForm = document.getElementById('availabilityForm');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    let allBookings = [];
    let userId = null;

    // Fetch vendor ID from profile
    async function getProfile() {
        try {
            const res = await fetch('/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                userId = data.data.id;
                loadBookings();
                loadBlockedDates();
            }
        } catch (err) {
            console.error('Error fetching profile', err);
        }
    }

    // Fetch and render bookings
    async function loadBookings() {
        try {
            const res = await fetch('/vendors/booking-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                allBookings = Array.isArray(data) ? data : (data.requests || []);
                renderBookings(allBookings);
            }
        } catch (err) {
            console.error('Error loading bookings', err);
            vendorsGrid.innerHTML = '<p>Error loading bookings.</p>';
        }
    }

    function renderBookings(bookings) {
        vendorsGrid.innerHTML = '';
        if (bookings.length === 0) {
            vendorsGrid.innerHTML = '<p>No bookings found.</p>';
            return;
        }

        bookings.forEach(item => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            // Format status
            const statusClass = `status-${item.status}`;
            const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);

            card.innerHTML = `
                <div class="event-header">
                    <h3>${item.booking_title || item.title || 'Event'}</h3>
                    <span class="event-datetime">${new Date(item.event_start).toLocaleString()}</span>
                </div>
                <div class="event-details">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <p><strong>Customer:</strong> ${item.customer_name || 'Customer'}</p>
                    <p><strong>Service:</strong> ${item.service_title || 'Service'}</p>
                    <p><strong>Quoted Price:</strong> ₹${item.price_quote || item.price || 'N/A'}</p>
                </div>
                ${item.status === 'accepted' ? `<button class="action-btn" onclick="completeBooking('${item.id}')">Mark as Done</button>` : ''}
                ${item.status === 'pending' ? `
                    <div style="margin-top: 10px;">
                        <button class="action-btn" onclick="updateStatus('${item.id}', 'accepted')">Accept</button>
                        <button class="action-btn" style="background: #dc3545;" onclick="updateStatus('${item.id}', 'cancelled')">Decline</button>
                    </div>
                ` : ''}
            `;
            vendorsGrid.appendChild(card);
        });
    }

    // Global action functions
    window.completeBooking = async (itemId) => {
        if (!confirm('Are you sure the service is complete? This will trigger the payout process.')) return;
        try {
            const res = await fetch(`/bookings/items/${itemId}/complete`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Service marked as completed!');
                loadBookings();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to complete booking');
            }
        } catch (err) {
            console.error(err);
        }
    };

    window.updateStatus = async (itemId, status) => {
        try {
            const res = await fetch(`/vendors/booking-requests/${itemId}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                alert(`Booking ${status}!`);
                loadBookings();
            } else {
                const data = await res.json();
                alert(data.message || 'Update failed');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Filter logic
    searchBtn.addEventListener('click', () => {
        const filter = statusFilter.value;
        const query = searchInput.value.toLowerCase();
        
        const filtered = allBookings.filter(item => {
            const matchesStatus = filter === 'all' || item.status === filter;
            const matchesSearch = (item.booking_title || item.title || '').toLowerCase().includes(query) ||
                                (item.customer_name || '').toLowerCase().includes(query);
            return matchesStatus && matchesSearch;
        });
        renderBookings(filtered);
    });

    // Availability Handling
    availabilityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const start_time = document.getElementById('blockStart').value;
        const end_time = document.getElementById('blockEnd').value;
        const reason = document.getElementById('blockReason').value;

        if (!userId) {
            alert('User profile not loaded yet');
            return;
        }

        try {
            const res = await fetch(`/vendors/${userId}/availability`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ start_time, end_time, reason })
            });
            if (res.ok) {
                alert('Dates blocked successfully!');
                availabilityForm.reset();
                loadBlockedDates();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to block dates');
            }
        } catch (err) {
            console.error(err);
        }
    });

    async function loadBlockedDates() {
        if (!userId) return;
        try {
            const res = await fetch(`/vendors/${userId}/availability`);
            const data = await res.json();
            if (res.ok) {
                const blocks = Array.isArray(data) ? data : (data.blocks || []);
                renderBlockedDates(blocks);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderBlockedDates(blocks) {
        blockedDatesList.innerHTML = '';
        if (blocks.length === 0) {
            blockedDatesList.innerHTML = '<p style="font-size: 13px; color: #888;">No dates blocked.</p>';
            return;
        }

        blocks.forEach(block => {
            const item = document.createElement('div');
            item.className = 'blocked-item';
            item.innerHTML = `
                <div>
                    <strong>${block.reason || 'Blocked'}</strong><br>
                    <small>${new Date(block.start_time).toLocaleDateString()} - ${new Date(block.end_time).toLocaleDateString()}</small>
                </div>
                <button class="btn-delete" onclick="removeBlock('${block.id}')">×</button>
            `;
            blockedDatesList.appendChild(item);
        });
    }

    window.removeBlock = async (blockId) => {
        if (!confirm('Remove this block?')) return;
        try {
            const res = await fetch(`/vendors/${userId}/availability/${blockId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadBlockedDates();
            }
        } catch (err) {
            console.error(err);
        }
    };

    getProfile();
});
