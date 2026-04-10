// --- ADVANCED API UTILITY: Transparent Session Recovery ---
// Defined GLOBALLY so other scripts can use it immediately
window.fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    
    // Prepare headers
    if (!options.headers) options.headers = {};
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    // Set JSON content type by default if not sending FormData
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    try {
        let response = await fetch(url, {
            ...options,
            credentials: 'include' // 🛡️ CRITICAL: Ensures refresh cookies work across ports (e.g. 5500 to 5000)
        });

        // If 401 Unauthorized, attempt a single silent refresh and retry
        if (response.status === 401) {
            console.log('Session expired, attempting silent recovery...');
            const refreshed = await silentRefresh();
            
            if (refreshed) {
                // Update header with NEW token
                const newToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
                options.headers['Authorization'] = `Bearer ${newToken}`;
                
                // Retry original request ONCE
                response = await fetch(url, options);
            } else {
                // Refresh failed, session is truly dead
                console.error('Session recovery failed. Redirecting to login.');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('authToken');
                window.location.href = 'login2.html';
                return response;
            }
        }
        return response;
    } catch (err) {
        console.error('Fetch with auth error:', err);
        throw err;
    }
};

function getStoredAuthToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
}

function getProfileFromStoredToken() {
    const token = getStoredAuthToken();
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            full_name: payload.full_name,
            name: payload.name,
            email: payload.email
        };
    } catch (e) {
        console.error('Failed to parse stored auth token:', e);
        return null;
    }
}

// Silent Token Refresh (Improved to return success status)
async function silentRefresh() {
    const hasToken = !!getStoredAuthToken();
    if(!hasToken) return false;

    try {
        const res = await fetch('/auth/refresh', { 
            method: 'POST',
            credentials: 'include' 
        });
        if(res.ok) {
            const data = await res.json();
            if(data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('authToken', data.accessToken);
                console.log('Session recovered successfully.');
                return true;
            }
        }
    } catch(e) {
        console.error('Refresh call failed:', e);
    }
    return false;
}

// Global initialization logic
document.addEventListener('DOMContentLoaded', async () => {
    const profileContainer = document.querySelector('.profile');
    const profileImg = profileContainer ? profileContainer.querySelector('img') : null;

    if (!profileContainer) return;

    function normalizeProfile(payload = {}) {
        const source = payload.data || payload.user || payload || {};
        return {
            full_name: source.full_name || source.fullName || source.name || source.business_name || '',
            name: source.name || source.full_name || source.fullName || '',
            business_name: source.business_name || '',
            email: source.email || source.user_email || '',
            profile_image: source.profile_image || source.avatar || source.image || ''
        };
    }

    function ensureNavUserNameElement() {
        let navUserName = document.getElementById('navUserName');
        if (navUserName) return navUserName;

        navUserName = document.createElement('span');
        navUserName.id = 'navUserName';

        const greeting = profileContainer.querySelector('.nav-greeting');
        if (greeting) {
            greeting.insertAdjacentElement('afterend', navUserName);
        } else if (profileImg) {
            profileContainer.insertBefore(navUserName, profileImg);
        } else {
            profileContainer.appendChild(navUserName);
        }

        return navUserName;
    }

    function setNavbarProfile(profile = {}) {
        const safeProfile = normalizeProfile(profile);
        const navUserName = ensureNavUserNameElement();
        const displayName = safeProfile.full_name || safeProfile.name || safeProfile.business_name || 'User';

        navUserName.textContent = displayName;
        if (profileImg) {
            profileImg.alt = `${displayName} profile`;
        }

        if (profileImg && safeProfile.profile_image) {
            profileImg.src = safeProfile.profile_image;
        }

        const dropdownName = document.getElementById('dd-name');
        const dropdownEmail = document.getElementById('dd-email');
        if (dropdownName) dropdownName.textContent = displayName;
        if (dropdownEmail) dropdownEmail.textContent = safeProfile.email || '';
    }

    // Inject CSS for the dropdowns
    const style = document.createElement('style');
    style.textContent = `
        .profile { position: relative; }
        .profile-dropdown {
            position: absolute;
            top: 60px;
            right: 0;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            width: 200px;
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 1000;
            font-family: 'Poppins', sans-serif;
            color: #333;
        }
        .profile-dropdown.show { display: flex; }
        .profile-dropdown-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #eee;
            text-align: center;
        }
        .profile-dropdown-header h4 { margin: 0; font-size: 14px; color: #222; }
        .profile-dropdown-header p { margin: 5px 0 0; font-size: 12px; color: #666; }
        .profile-dropdown button {
            padding: 12px 15px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 14px;
            color: #444;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .profile-dropdown button:hover { background: #f1f1f1; }
        .profile-dropdown button.danger { color: #dc3545; }
        .profile-dropdown button.danger:hover { background: #ffe6e6; }
        .profile-dropdownhr { margin: 0; border: none; border-top: 1px solid #eee; }

        .notif-dropdown {
            position: absolute;
            top: 60px;
            right: 50px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            width: 300px;
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 1000;
            font-family: 'Poppins', sans-serif;
            color: #333;
        }
        .notif-dropdown.show { display: flex; }
        .notif-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #eee; font-weight: 600;}
        .notif-body { max-height: 300px; overflow-y: auto; }
        .notif-item { padding: 12px 15px; border-bottom: 1px solid #f1f1f1; font-size: 13px; cursor: pointer; transition: background 0.2s;}
        .notif-item:hover { background: #f9f9f9; }
        .notif-item.unread { background: #e8f4fd; font-weight: 500; }
        .notif-empty { padding: 20px; text-align: center; color: #888; font-size: 13px; }
    `;
    document.head.appendChild(style);

    // Create Dropdown HTML
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <h4 id="dd-name">Loading...</h4>
            <p id="dd-email"></p>
        </div>
        <button id="dd-change-avatar">📷 Change Avatar</button>
        <button id="dd-logout">🚪 Logout</button>
        <div class="profile-dropdownhr"></div>
        <button id="dd-delete-account" class="danger">🗑 Delete Account</button>
    `;
    profileContainer.appendChild(dropdown);

    // Create Notification Dropdown HTML
    const notifBtn = document.querySelector('.notifications-btn');
    let notifDropdown = null;
    if (notifBtn) {
        notifDropdown = document.createElement('div');
        notifDropdown.className = 'notif-dropdown';
        notifDropdown.innerHTML = `
            <div class="notif-header">Notifications</div>
            <div class="notif-body" id="notif-list">
                <div class="notif-empty">Loading...</div>
            </div>
        `;
        profileContainer.appendChild(notifDropdown);

        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(dropdown.classList.contains('show')) dropdown.classList.remove('show');
            notifDropdown.classList.toggle('show');
            if(notifDropdown.classList.contains('show')) {
                loadNotifications();
            }
        });
        notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Toggle Dropdown
    if (profileImg) {
        profileImg.style.cursor = 'pointer';
        profileImg.removeAttribute('title');
        profileImg.addEventListener('click', (e) => {
            e.stopPropagation();
            if(notifDropdown && notifDropdown.classList.contains('show')) notifDropdown.classList.remove('show');
            dropdown.classList.toggle('show');
            if(dropdown.classList.contains('show')) {
                loadProfileData();
            }
        });
    }

    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
        if(notifDropdown) notifDropdown.classList.remove('show');
    });
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Actions
    document.getElementById('dd-change-avatar').addEventListener('click', () => {
        const uploadInput = document.getElementById('profileUploadInput');
        if (uploadInput) {
            uploadInput.click();
        } else {
            alert('Avatar upload not configured on this page.');
        }
    });

    document.getElementById('dd-logout').addEventListener('click', async () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        if (token) {
            try {
                await window.fetchWithAuth('/auth/logout', { 
                    method: 'POST'
                });
            } catch(e) { console.error('Logout error', e); }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authToken');
        window.location.href = 'login2.html';
    });

    document.getElementById('dd-delete-account').addEventListener('click', async () => {
        if(confirm('Are you strictly sure you want to delete your account? This action cannot be undone.')) {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            try {
                const res = await window.fetchWithAuth('/auth/profile', {
                    method: 'DELETE'
                });
                if(res.ok) {
                    alert('Account deleted successfully.');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('authToken');
                    window.location.href = 'signup.html';
                } else {
                    const data = await res.json();
                    alert('Failed to delete account: ' + data.message);
                }
            } catch(e) {
                console.error(e);
                alert('Error deleting account.');
            }
        }
    });

    // Load Data
    let profileLoaded = false;
    let profileDataPromise = null;
    async function loadProfileData() {
        const token = getStoredAuthToken();
        if (!token) {
            setNavbarProfile({ full_name: 'Guest' });
            profileLoaded = true;
            return null;
        }

        const storedProfile = getProfileFromStoredToken();
        if (storedProfile) {
            setNavbarProfile(storedProfile);
        }

        if (profileLoaded && profileDataPromise) {
            return profileDataPromise;
        }

        profileDataPromise = (async () => {
            try {
                const res = await window.fetchWithAuth('/auth/profile');
                if(res.ok) {
                    const data = await res.json();
                    const profile = normalizeProfile(data);
                    setNavbarProfile(profile);
                    profileLoaded = true;
                    return profile;
                }

                if (res.status === 401) {
                    setNavbarProfile({ ...(storedProfile || {}), full_name: 'Session Expired' });
                } else if (!storedProfile) {
                    setNavbarProfile({ full_name: 'User' });
                }
                console.error(`Failed to load profile for navbar. Status: ${res.status}`);
                return null;
            } catch(e) {
                console.error(e);
                if (!storedProfile) {
                    setNavbarProfile({ full_name: 'User' });
                }
                return null;
            }
        })();

        try {
            return await profileDataPromise;
        } finally {
            if (!profileLoaded) {
                profileDataPromise = null;
            }
        }
    }

    // Notifications Logic
    async function loadNotifications() {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        const listDiv = document.getElementById('notif-list');
        if (!token) {
            listDiv.innerHTML = '<div class="notif-empty">Please login to see notifications.</div>';
            return;
        }

        try {
            const res = await window.fetchWithAuth('/notifications');
            if (res.ok) {
                let data = await res.json();
                if(data.data) data = data.data;
                const notifications = Array.isArray(data) ? data : (data.notifications || []);
                
                listDiv.innerHTML = '';
                if (notifications.length === 0) {
                    listDiv.innerHTML = '<div class="notif-empty">No new notifications</div>';
                    return;
                }

                notifications.forEach(notif => {
                    const item = document.createElement('div');
                    item.className = 'notif-item' + (notif.read ? '' : ' unread');
                    item.innerHTML = `<div>${notif.message}</div><small style="color:#aaa;">${new Date(notif.createdAt).toLocaleString()}</small>`;
                    
                    item.addEventListener('click', async () => {
                        if(!notif.read) {
                            try {
                                await window.fetchWithAuth(`/notifications/${notif.id || notif._id}/read`, {
                                    method: 'PATCH'
                                });
                                item.classList.remove('unread');
                            } catch(e) {}
                        }
                    });
                    listDiv.appendChild(item);
                });
            } else {
                listDiv.innerHTML = '<div class="notif-empty">Failed to load notifications</div>';
            }
        } catch(err) {
            listDiv.innerHTML = '<div class="notif-empty">Error loading notifications</div>';
        }
    }

    // Initial interval for background refresh
    loadProfileData();
    setInterval(silentRefresh, 600000); // 10 mins
});
