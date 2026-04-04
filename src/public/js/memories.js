const memories = [
    {
        title: "Sanjay & Riya's Wedding",
        date: "2026-02-12",
        location: "Mumbai, India",
        type: "wedding",
        year: "2026",
        image: "images/my wedding.jpg",
        description: "A beautiful ceremony with elegant decor and heartfelt vows.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
        title: "Aarav's 1st Birthday",
        date: "2025-11-05",
        location: "Delhi, India",
        type: "birthday",
        year: "2025",
        image: "images/birthday.jpg",
        description: "A fun family celebration with balloons, games, and cake.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
        title: "Ganesh Chaturthi Celebration",
        date: "2025-09-18",
        location: "Pune, India",
        type: "festival",
        year: "2025",
        image: "images/ganesh chaturthi.png",
        description: "Festival vibes with devotional songs, lights, and sweets.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
        title: "Corporate Gala Night",
        date: "2024-12-10",
        location: "Bengaluru, India",
        type: "corporate",
        year: "2024",
        image: "images/corporate.jpeg",
        description: "An evening of networking with a spectacular stage show.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
        title: "Diwali Lights Festival",
        date: "2024-11-01",
        location: "Jaipur, India",
        type: "festival",
        year: "2024",
        image: "images/festival.jpg",
        description: "A vibrant evening with fireworks, rangoli, and family.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
        title: "Themed Wedding Reception",
        date: "2024-06-21",
        location: "Chennai, India",
        type: "wedding",
        year: "2024",
        image: "images/wedding.png",
        description: "A modern reception with a floral stage and dance performances.",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
];

const memoriesGrid = document.getElementById('memoriesGrid');
const yearFilter = document.getElementById('yearFilter');
const typeFilter = document.getElementById('typeFilter');
const searchInput = document.querySelector('.search-box input');
const searchButton = document.querySelector('.search-box button');
const noResults = document.getElementById('noResults');

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function renderMemories(filter = {}) {
    const { year = 'all', type = 'all', query = '' } = filter;
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = memories.filter(memory => {
        const matchesYear = year === 'all' || memory.year === year;
        const matchesType = type === 'all' || memory.type === type;
        const matchesQuery = !normalizedQuery ||
            memory.title.toLowerCase().includes(normalizedQuery) ||
            memory.location.toLowerCase().includes(normalizedQuery);

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
                <img src="${memory.image}" alt="${memory.title}">
            </div>
            <div class="memory-content">
                <div class="memory-title">${memory.title}</div>
                <div class="memory-meta">
                    <span>📅 ${formatDate(memory.date)}</span>
                    <span>📍 ${memory.location}</span>
                </div>
                <div class="memory-description">${memory.description}</div>
                <div class="memory-footer">
                    <button class="watch-btn" onclick="watchMemory('${memory.video}')">Watch Memory</button>
                    <span class="memory-tag">${memory.type.toUpperCase()}</span>
                </div>
            </div>
        `;
        memoriesGrid.appendChild(card);
    });

    reveal();
}

function watchMemory(url) {
    window.open(url, '_blank');
}

function updateFilters() {
    renderMemories({
        year: yearFilter.value,
        type: typeFilter.value,
        query: searchInput.value
    });
}

yearFilter.addEventListener('change', updateFilters);
typeFilter.addEventListener('change', updateFilters);
searchButton.addEventListener('click', updateFilters);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        updateFilters();
    }
});

// Initialize
renderMemories();
