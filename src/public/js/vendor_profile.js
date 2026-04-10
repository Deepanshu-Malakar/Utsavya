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
    configureReportButtonVisibility();

    const reportModal = document.getElementById('reportModal');
    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) closeReportModal();
        });
    }
});

function getStoredAuthToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
}

function getCurrentUserRole() {
    const token = getStoredAuthToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || null;
    } catch (_) {
        return null;
    }
}

function configureReportButtonVisibility() {
    const btn = document.getElementById('reportVendorBtn');
    if (!btn) return;
    const role = getCurrentUserRole();
    btn.style.display = role === 'customer' ? 'block' : 'none';
}

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
    const categoryImages = {
        venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
        catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
        photography: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
        music: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        decor: 'https://images.unsplash.com/photo-1522673607200-164883efcdf1?auto=format&fit=crop&w=1200&q=80',
        other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'
    };

    document.title = `${data.full_name} – Utsavya`;

    // Hero
    const mainCategory = (data.services && data.services[0]?.category || 'other').toLowerCase();
    const fallbackImg = categoryImages[mainCategory] || categoryImages.other;

    document.getElementById('vendorName').textContent = data.full_name || 'Vendor';
    document.getElementById('vendorAvatar').src = data.profile_image || fallbackImg;
    document.getElementById('vendorAvatar').onerror = function() { this.src = categoryImages.other; };
    
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
    const serviceDescriptions = (data.services || [])
        .filter(service => service && service.description)
        .map(service => `<strong>${service.title || 'Service'}:</strong> ${service.description.trim()}`);

    document.getElementById('vendorAbout').innerHTML =
        serviceDescriptions.join('<br><br>') ||
        data.bio ||
        data.description ||
        `${data.full_name} is a professional event vendor. Contact to learn more about their services.`;

    // Quick info
    document.getElementById('infoRating').textContent = rating > 0 ? `${rating.toFixed(1)} / 5.0` : 'Not rated yet';
    document.getElementById('infoServices').textContent = (data.services || []).length;

    // Hero background (use cover_image, fallback to category image, then default gradient)
    const heroBg = document.getElementById('heroBg');
    if (heroBg) {
        if (data.cover_image) {
            heroBg.src = data.cover_image;
        } else {
            heroBg.src = fallbackImg;
        }
        heroBg.onerror = function() { this.src = categoryImages.other; };
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

function getMediaUrl(media) {
    return media?.media_url || media?.url || '';
}

function isVideoMedia(media) {
    const mediaUrl = getMediaUrl(media);
    return media?.media_type === 'video' || /\.(mp4|webm|ogg|mov|m4v)$/i.test(mediaUrl);
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
                allMedia = allMedia.concat(
                    items
                        .map(m => ({
                            ...m,
                            url: getMediaUrl(m),
                            serviceTitle: service.title
                        }))
                        .filter(m => m.url)
                );
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
        const isVideo = isVideoMedia(m);
        return `
            <div class="portfolio-item" onclick="openLightbox('${m.url}', ${isVideo})">
                <div class="portfolio-service-tag">${m.serviceTitle || 'Service'}</div>
                ${isVideo
                    ? `<video src="${m.url}" muted preload="metadata" style="pointer-events:none;"></video>`
                    : `<img src="${m.url}" alt="Portfolio ${i+1}" loading="lazy">`
                }
                <div class="portfolio-caption">${m.serviceTitle || 'Service'}</div>
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
        const itemRes = await window.fetchWithAuth(`/bookings/reviewable-item?vendor_id=${encodeURIComponent(vendorId)}&service_id=${encodeURIComponent(selectedServiceId)}`);
        const itemPayload = await itemRes.json();
        const bookingItem = itemPayload.data || null;

        if (!itemRes.ok) {
            throw new Error(itemPayload.message || 'Could not validate your completed booking for this review');
        }

        if (!bookingItem?.id) {
            throw new Error('You can review this vendor only after a completed, paid booking for the selected service.');
        }

        const res = await window.fetchWithAuth('/reviews', {
            method: 'POST',
            body: JSON.stringify({
                booking_item_id: bookingItem.id,
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

function openReportModal() {
    const role = getCurrentUserRole();
    if (role !== 'customer') {
        showNotification('Only customers can report vendors.', 'error');
        return;
    }
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

async function submitVendorReport() {
    if (!vendorId) return;
    const reasonEl = document.getElementById('reportReason');
    const detailsEl = document.getElementById('reportDetails');
    const reason = (reasonEl?.value || '').trim();
    const details = (detailsEl?.value || '').trim();

    if (!reason) {
        showNotification('Please select a complaint reason.', 'error');
        return;
    }

    try {
        const res = await window.fetchWithAuth(`/vendors/${vendorId}/report`, {
            method: 'POST',
            body: JSON.stringify({ reason, details })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || 'Failed to submit complaint.');
        }

        closeReportModal();
        if (reasonEl) reasonEl.value = '';
        if (detailsEl) detailsEl.value = '';
        showNotification('Complaint submitted. Admins will review it.', 'success');
    } catch (err) {
        showNotification(err.message || 'Could not submit complaint.', 'error');
    }
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
