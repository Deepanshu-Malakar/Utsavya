// ===== VENDOR PROFILE PAGE JS =====
// Reads vendorId from URL and loads all vendor data

let vendorId = null;
let vendorData = null;
let selectedRating = 0;
let selectedServiceId = null;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    vendorId = params.get('id');

    if (!vendorId) {
        showNotification('No vendor specified. Redirecting...', 'error');
        setTimeout(() => history.back(), 1500);
        return;
    }

    loadVendorProfile();
    setupStarInput();
});

// ===== LOAD FULL VENDOR PROFILE =====
async function loadVendorProfile() {
    try {
        const res = await window.fetchWithAuth(`/vendors/${vendorId}`);
        if (!res.ok) throw new Error('Failed to load vendor profile');
        const data = await res.json();
        vendorData = data;
        renderProfile(data);
        renderServices(data.services || []);
        renderReviews(data.reviews || []);
        await loadPortfolio(data.services || []);
    } catch (err) {
        console.error(err);
        showNotification('Could not load vendor profile. Please try again.', 'error');
        document.getElementById('vendorName').textContent = 'Error loading profile';
    }
}

// ===== RENDER HERO + META =====
function renderProfile(data) {
    document.title = `${data.full_name} – Utsavya`;

    // Hero
    document.getElementById('vendorName').textContent = data.full_name || 'Vendor';
    document.getElementById('vendorAvatar').src = data.profile_image || 'images/default-vendor.jpg';
    
    const city = data.city || (data.services && data.services[0]?.city) || '';
    document.getElementById('vendorCity').textContent = city ? `📍 ${city}` : '';
    document.getElementById('infoCity').textContent = city || '–';

    // Category from services
    const category = data.services && data.services.length > 0
        ? data.services.map(s => s.category || s.title).join(', ')
        : 'Events Services';
    document.getElementById('vendorCategory').textContent = category;
    document.getElementById('infoCategory').textContent = category;

    // Tagline (if customized)
    if (data.tagline) {
        document.getElementById('vendorTagline').textContent = `"${data.tagline}"`;
    }

    // Rating
    const rating = parseFloat(data.average_rating) || 0;
    const ratingCount = parseInt(data.total_reviews) || 0;
    const starsStr = ratingToStars(rating);
    document.getElementById('heroStars').textContent = starsStr;
    document.getElementById('heroRatingText').textContent = `${rating.toFixed(1)} (${ratingCount} review${ratingCount !== 1 ? 's' : ''})`;

    // Stats bar
    document.getElementById('statRating').textContent = rating > 0 ? `${rating.toFixed(1)}⭐` : '–';
    document.getElementById('statReviews').textContent = ratingCount;
    document.getElementById('statServices').textContent = (data.services || []).length;

    const minPrice = data.services && data.services.length > 0
        ? Math.min(...data.services.map(s => parseFloat(s.price) || 0))
        : 0;
    document.getElementById('statStartingPrice').textContent = minPrice > 0 ? `₹${minPrice.toLocaleString('en-IN')}` : '–';
    document.getElementById('sidebarPrice').innerHTML = minPrice > 0
        ? `₹${minPrice.toLocaleString('en-IN')} <small>onwards</small>`
        : `<small>Contact for pricing</small>`;

    // About
    document.getElementById('vendorAbout').textContent =
        data.bio || data.description || `${data.full_name} is a professional event vendor. Contact to learn more about their services.`;

    // Quick info
    document.getElementById('infoRating').textContent = rating > 0 ? `${rating.toFixed(1)} / 5.0` : 'Not rated yet';
    document.getElementById('infoServices').textContent = (data.services || []).length;

    // Hero background (use first media if available, else gradient remains)
    if (data.cover_image) {
        document.getElementById('heroBg').src = data.cover_image;
    }
}

function ratingToStars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ===== RENDER SERVICES =====
function renderServices(services) {
    const grid = document.getElementById('servicesGrid');
    const select = document.getElementById('reviewServiceSelect');

    if (!services || services.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;font-size:14px;">No services listed yet.</p>';
        return;
    }

    grid.innerHTML = services.map(s => `
        <div class="service-item">
            <h4>${s.title || 'Service'}</h4>
            <p>${s.description ? s.description.substring(0, 80) + '...' : ''}</p>
            <div class="service-price">
                ₹${parseFloat(s.price || 0).toLocaleString('en-IN')}
                <span class="service-price-type">${s.price_type === 'per_person' ? '/ person' : ' fixed'}</span>
            </div>
            ${s.city ? `<div style="font-size:11px;color:#888;margin-top:6px;">📍 ${s.city}</div>` : ''}
        </div>
    `).join('');

    // Populate select for review form
    select.innerHTML = '<option value="">Select which service you used...</option>';
    services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.title || 'Service';
        select.appendChild(opt);
    });
    select.addEventListener('change', () => {
        selectedServiceId = select.value || null;
    });
}

// ===== LOAD PORTFOLIO (media from all services) =====
async function loadPortfolio(services) {
    const grid = document.getElementById('portfolioGrid');
    let allMedia = [];

    for (const service of services) {
        try {
            const res = await window.fetchWithAuth(`/services/${service.id}/media`);
            if (res.ok) {
                const mediaList = await res.json();
                const items = Array.isArray(mediaList) ? mediaList : (mediaList.data || []);
                allMedia = allMedia.concat(items.map(m => ({ ...m, serviceTitle: service.title })));
            }
        } catch (e) {
            // silently skip
        }
    }

    if (allMedia.length === 0) {
        grid.innerHTML = `
            <div class="portfolio-empty">
                <span class="portfolio-empty-icon">📷</span>
                No portfolio items uploaded yet.
            </div>
        `;
        return;
    }

    grid.innerHTML = allMedia.map((m, i) => {
        const isVideo = m.media_type === 'video' || (m.url && m.url.match(/\.(mp4|webm|ogg)$/i));
        return `
            <div class="portfolio-item" onclick="openLightbox('${m.url}', ${isVideo})">
                ${isVideo
                    ? `<video src="${m.url}" muted preload="metadata" style="pointer-events:none;"></video>`
                    : `<img src="${m.url}" alt="Portfolio ${i+1}" loading="lazy">`
                }
                <div class="portfolio-overlay">
                    <span>${isVideo ? '▶' : '🔍'}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDER REVIEWS =====
function renderReviews(reviews) {
    const list = document.getElementById('reviewsList');
    if (!reviews || reviews.length === 0) {
        list.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to leave one!</div>';
        return;
    }

    list.innerHTML = reviews.map(r => {
        const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
        const mediaHtml = r.media && r.media.length > 0 ? `
            <div class="review-media">
                ${r.media.map(m => {
                    const isVideo = m.media_type === 'video' || (m.url && m.url.match(/\.(mp4|webm|ogg)$/i));
                    return isVideo
                        ? `<video src="${m.url}" onclick="openLightbox('${m.url}', true)" title="Click to view"></video>`
                        : `<img src="${m.url}" onclick="openLightbox('${m.url}', false)" alt="Review photo">`;
                }).join('')}
            </div>` : '';
        return `
            <div class="review-card">
                <div class="review-header">
                    <span class="reviewer-name">${r.reviewer_name || r.full_name || 'Customer'}</span>
                    <span class="review-date">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : ''}</span>
                </div>
                <div class="review-stars">${stars} <strong>${r.rating}/5</strong></div>
                <div class="review-comment">${r.comment || ''}</div>
                ${mediaHtml}
            </div>
        `;
    }).join('');
}

// ===== STAR INPUT =====
function setupStarInput() {
    const stars = document.querySelectorAll('#starInput span');
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.dataset.value);
            stars.forEach((s, i) => s.classList.toggle('active', i < val));
        });
        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
        });
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
        });
    });
}

// ===== SUBMIT REVIEW =====
async function submitReview() {
    if (!selectedRating || selectedRating < 1) {
        showNotification('Please select a rating first.', 'error');
        return;
    }
    if (!selectedServiceId) {
        showNotification('Please select which service you are reviewing.', 'error');
        return;
    }
    const comment = document.getElementById('reviewComment').value.trim();
    const btn = document.getElementById('submitReviewBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        // Reviews require a booking_item_id – look it up from user's bookings
        const res = await window.fetchWithAuth('/reviews', {
            method: 'POST',
            body: JSON.stringify({
                vendor_id: vendorId,
                service_id: selectedServiceId,
                rating: selectedRating,
                comment
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to submit review');

        showNotification('Review submitted! Thank you.', 'success');
        document.getElementById('reviewComment').value = '';
        selectedRating = 0;
        document.querySelectorAll('#starInput span').forEach(s => s.classList.remove('active'));

        // Reload vendor to show new review
        setTimeout(() => loadVendorProfile(), 800);
    } catch (err) {
        showNotification(err.message || 'Failed to submit review.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Review';
    }
}

// ===== BOOK VENDOR =====
function addVendorToEvent() {
    if (!vendorId) return;
    sessionStorage.setItem('selectedVendorId', vendorId);
    sessionStorage.setItem('selectedVendorName', vendorData?.full_name || 'Vendor');
    window.location.href = 'vendors_page.html';
}

function scrollToBook() {
    document.getElementById('bookCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== LIGHTBOX =====
function openLightbox(url, isVideo) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    const vid = document.getElementById('lightboxVideo');

    if (isVideo) {
        img.style.display = 'none';
        vid.style.display = 'block';
        vid.src = url;
    } else {
        vid.style.display = 'none';
        vid.src = '';
        img.style.display = 'block';
        img.src = url;
    }
    lb.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.remove('show');
    document.getElementById('lightboxVideo').pause?.();
    document.getElementById('lightboxVideo').src = '';
    document.body.style.overflow = '';
}

// ===== NOTIFICATIONS =====
function showNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}
