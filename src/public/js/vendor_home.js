// Tab switching functionality
function showRequestsTab() {
    document.getElementById('requestsSection').classList.add('active');
    document.getElementById('servicesSection').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showServicesTab() {
    document.getElementById('requestsSection').classList.remove('active');
    document.getElementById('servicesSection').classList.add('active');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    loadServices();
}

// Load vendor services
async function loadServices() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert('Please log in to view your services');
        return;
    }

    try {
        const response = await fetch('/services/vendor', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load services');
        }

        const services = await response.json();
        renderServices(services);
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
        </div>
    `).join('');

    servicesGrid.innerHTML = servicesHTML;
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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Show requests tab by default
    showRequestsTab();
});