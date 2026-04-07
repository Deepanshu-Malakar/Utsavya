const memoriesGrid = document.getElementById('memoriesGrid');
const yearFilter = document.getElementById('yearFilter');
const typeFilter = document.getElementById('typeFilter');
const searchInput = document.querySelector('.search-box input');
const searchButton = document.querySelector('.search-box button');
const noResults = document.getElementById('noResults');

let memories = [];

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function deriveMemoryType(memory) {
    const source = `${memory.event_title || ''} ${memory.service_title || ''}`.toLowerCase();
    if (source.includes('wedding')) return 'wedding';
    if (source.includes('birthday')) return 'birthday';
    if (source.includes('festival')) return 'festival';
    if (source.includes('corporate')) return 'corporate';
    return 'other';
}

function normalizeMemory(memory) {
    const eventDate = memory.event_start || memory.created_at;
    return {
        ...memory,
        date: eventDate,
        year: eventDate ? String(new Date(eventDate).getFullYear()) : 'Unknown',
        type: deriveMemoryType(memory)
    };
}

function populateYearOptions(items) {
    if (!yearFilter) return;

    const years = [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    yearFilter.innerHTML = '<option value="all">All Years</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
}

function renderMemories(filter = {}) {
    const { year = 'all', type = 'all', query = '' } = filter;
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = memories.filter(memory => {
        const matchesYear = year === 'all' || memory.year === year;
        const matchesType = type === 'all' || memory.type === type;
        const matchesQuery = !normalizedQuery ||
            (memory.event_title || '').toLowerCase().includes(normalizedQuery) ||
            (memory.location || '').toLowerCase().includes(normalizedQuery) ||
            (memory.vendor_name || '').toLowerCase().includes(normalizedQuery) ||
            (memory.service_title || '').toLowerCase().includes(normalizedQuery);

        return matchesYear && matchesType && matchesQuery;
    });

    memoriesGrid.innerHTML = '';

    if (filtered.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    filtered.forEach(memory => {
        const card = document.createElement('div');
        card.className = 'memory-card reveal';
        card.innerHTML = `
            <div class="memory-thumb">
                ${memory.media_type === 'video'
                    ? `<video src="${memory.media_url}" muted preload="metadata" playsinline></video>`
                    : `<img src="${memory.media_url}" alt="${memory.event_title || 'Memory'}">`
                }
            </div>
            <div class="memory-content">
                <div class="memory-title">${memory.event_title || 'Event Memory'}</div>
                <div class="memory-meta">
                    <span>📅 ${formatDate(memory.date)}</span>
                    <span>📍 ${memory.location || 'Location not added'}</span>
                </div>
                <div class="memory-description">
                    Shared by ${memory.vendor_name || 'your vendor'} for ${memory.service_title || 'your event service'}.
                </div>
                <div class="memory-footer">
                    <button class="watch-btn" onclick="watchMemory('${memory.media_url}')">
                        ${memory.media_type === 'video' ? 'Watch Video' : 'View Image'}
                    </button>
                    <span class="memory-tag">${memory.type.toUpperCase()}</span>
                </div>
            </div>
        `;
        memoriesGrid.appendChild(card);
    });

    if (typeof reveal === 'function') {
        reveal();
    }
}

window.watchMemory = function watchMemory(url) {
    window.open(url, '_blank', 'noopener');
};

function updateFilters() {
    renderMemories({
        year: yearFilter.value,
        type: typeFilter.value,
        query: searchInput.value
    });
}

async function loadMemories() {
    memoriesGrid.innerHTML = '<div class="memory-card"><div class="memory-content">Loading your memories...</div></div>';

    try {
        const res = await window.fetchWithAuth('/bookings/memories');
        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : (payload.data || []);

        if (!res.ok) {
            throw new Error(payload.message || 'Failed to load memories');
        }

        memories = items.map(normalizeMemory);
        populateYearOptions(memories);
        renderMemories({
            year: yearFilter.value,
            type: typeFilter.value,
            query: searchInput.value
        });
    } catch (error) {
        console.error('Error loading memories:', error);
        memories = [];
        memoriesGrid.innerHTML = '';
        noResults.style.display = 'block';
        const message = noResults.querySelector('p');
        if (message) {
            message.textContent = error.message || 'Could not load your memories right now.';
        }
    }
}

yearFilter.addEventListener('change', updateFilters);
typeFilter.addEventListener('change', updateFilters);
searchButton.addEventListener('click', updateFilters);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        updateFilters();
    }
});

document.addEventListener('DOMContentLoaded', loadMemories);
