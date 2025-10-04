// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const EXTERNAL_API_URL = '{{base_url}}admin/public/api/v1/report/users/details/15742?';

let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let filteredUsers = [];
let autoRefreshInterval;
let currentView = 'table';

// DOM Elements
let elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupSynchronizedScrolling();
    loadUsers();
    setupEventListeners();
    startAutoRefresh();
    updateLastUpdateTime();
});

// Initialize DOM elements
function initializeElements() {
    elements = {
        // Core elements
        usersTableBody: document.getElementById('usersTableBody'),
        usersGrid: document.getElementById('usersGrid'),
        totalUsers: document.getElementById('totalUsers'),
        todayUsers: document.getElementById('todayUsers'),
        countriesCount: document.getElementById('countriesCount'),
        recentUsers: document.getElementById('recentUsers'),
        activeUsers: document.getElementById('activeUsers'),
        lastUpdateTime: document.getElementById('lastUpdateTime'),
        
        // Filters and inputs
        searchInput: document.getElementById('searchInput'),
        countryFilter: document.getElementById('countryFilter'),
        dateFilter: document.getElementById('dateFilter'),
        
        // Buttons
        refreshBtn: document.getElementById('sidebarRefreshBtn'),
        exportBtn: document.getElementById('sidebarExportBtn'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        closeModal: document.getElementById('closeModal'),
        menuToggle: document.getElementById('menuToggle'),
        
        // View controls
        tableView: document.getElementById('tableView'),
        gridView: document.getElementById('gridView'),
        viewButtons: document.querySelectorAll('.view-btn'),
        
        // Info displays
        pageInfo: document.getElementById('pageInfo'),
        showingCount: document.getElementById('showingCount'),
        
        // UI elements
        loadingSpinner: document.getElementById('loadingSpinner'),
        userModal: document.getElementById('userModal'),
        userDetails: document.getElementById('userDetails'),
        notificationContainer: document.getElementById('notificationContainer'),
        sidebar: document.getElementById('sidebar'),
        mainWrapper: document.getElementById('mainWrapper')
    };
}

// Setup synchronized scrolling
function setupSynchronizedScrolling() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarNav && mainContent) {
        // Disable individual scrolling
        sidebarNav.style.overflowY = 'auto';
        
        // Sync sidebar scrolling with main content
        window.addEventListener('scroll', function() {
            const scrollPosition = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const sidebarScroll = (scrollPosition / maxScroll) * (sidebarNav.scrollHeight - sidebarNav.clientHeight);
            
            sidebarNav.scrollTop = sidebarScroll;
        });
        
        // Also sync when sidebar is scrolled (for touch devices)
        sidebarNav.addEventListener('scroll', function() {
            const sidebarScroll = sidebarNav.scrollTop;
            const maxSidebarScroll = sidebarNav.scrollHeight - sidebarNav.clientHeight;
            const mainScroll = (sidebarScroll / maxSidebarScroll) * (document.body.scrollHeight - window.innerHeight);
            
            window.scrollTo(0, mainScroll);
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // Search input with debouncing
    elements.searchInput.addEventListener('input', debounce(filterUsers, 300));
    
    // Filter changes
    elements.countryFilter.addEventListener('change', filterUsers);
    elements.dateFilter.addEventListener('change', filterUsers);
    
    // Action buttons
    elements.refreshBtn.addEventListener('click', () => {
        fetchFromExternalAPI();
    });
    elements.exportBtn.addEventListener('click', exportToCSV);
    elements.prevBtn.addEventListener('click', () => changePage(-1));
    elements.nextBtn.addEventListener('click', () => changePage(1));
    elements.closeModal.addEventListener('click', closeUserModal);
    elements.menuToggle.addEventListener('click', toggleSidebar);
    
    // View controls
    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchView(e.target.closest('.view-btn').dataset.view);
        });
    });
    
    // Close modal when clicking outside
    elements.userModal.addEventListener('click', (event) => {
        if (event.target === elements.userModal) {
            closeUserModal();
        }
    });
    
    // Close sidebar when clicking on overlay (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && 
            elements.sidebar.classList.contains('active') && 
            !elements.sidebar.contains(e.target) && 
            e.target !== elements.menuToggle) {
            toggleSidebar();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'r':
                    e.preventDefault();
                    fetchFromExternalAPI();
                    break;
                case 'e':
                    e.preventDefault();
                    exportToCSV();
                    break;
                case '/':
                    e.preventDefault();
                    elements.searchInput.focus();
                    break;
            }
        }
        
        // Escape key to close modal
        if (e.key === 'Escape') {
            if (elements.userModal.style.display === 'flex') {
                closeUserModal();
            }
            if (window.innerWidth <= 1024 && elements.sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        }
    });
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
}

// Toggle sidebar on mobile
function toggleSidebar() {
    elements.sidebar.classList.toggle('active');
    elements.menuToggle.innerHTML = elements.sidebar.classList.contains('active') ? 
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
}

// Handle window resize
function handleResize() {
    if (window.innerWidth > 1024) {
        elements.sidebar.classList.remove('active');
        elements.menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
}

// Switch between table and grid view
function switchView(view) {
    currentView = view;
    
    // Update active button
    elements.viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Show/hide views
    elements.tableView.classList.toggle('active', view === 'table');
    elements.gridView.classList.toggle('active', view === 'grid');
    
    // Re-render content
    renderContent();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fetch data from external API and update database
async function fetchFromExternalAPI() {
    showLoading(true);
    showNotification('🔄 Fetching latest data from external API...', 'info');
    
    try {
        // In a real implementation, you would call your external API here
        // For demo purposes, we'll simulate the API call
        await simulateExternalAPICall();
        
        // After fetching, reload the users from our database
        await loadUsers();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error fetching from external API:', error);
        showNotification('❌ Error fetching data: ' + error.message, 'error');
        
        // Fallback: just load existing data
        await loadUsers();
    } finally {
        showLoading(false);
    }
}

// Simulate external API call (replace with actual API call)
async function simulateExternalAPICall() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('📡 Simulating external API call...');
            resolve();
        }, 2000);
    });
}

// Load users from our database
async function loadUsers() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users?limit=1000`);
        const data = await response.json();
        
        if (data.status === 'success') {
            allUsers = data.users;
            filteredUsers = [...allUsers];
            updateStats();
            populateCountryFilter();
            renderContent();
            console.log(`✅ Loaded ${allUsers.length} users successfully`);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users: ' + error.message, 'error');
        
        // For demo purposes, load sample data if API is not available
        await loadSampleData();
    } finally {
        showLoading(false);
    }
}

// Load sample data for demo purposes
async function loadSampleData() {
    console.log('📋 Loading sample data for demo...');
    
    // Generate sample users
    const sampleUsers = Array.from({ length: 50 }, (_, i) => ({
        userID: 1000 + i,
        firstName: ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa'][i % 8],
        lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][i % 8],
        username: `user${1000 + i}`,
        country: ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil'][i % 8],
        accountID: 2000 + i,
        openDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        userType: 1,
        parentId: null,
        emailVerified: Math.random() > 0.3
    }));
    
    allUsers = sampleUsers;
    filteredUsers = [...allUsers];
    updateStats();
    populateCountryFilter();
    renderContent();
    
    showNotification('📋 Loaded sample data for demonstration', 'info');
}

// Update statistics
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const todayCount = allUsers.filter(user => 
        user.openDate && user.openDate.startsWith(today)
    ).length;
    
    const recentCount = allUsers.filter(user => 
        user.openDate && new Date(user.openDate) >= oneWeekAgo
    ).length;
    
    const countries = [...new Set(allUsers.map(user => user.country).filter(Boolean))];
    
    elements.totalUsers.textContent = allUsers.length.toLocaleString();
    elements.todayUsers.textContent = todayCount.toLocaleString();
    elements.recentUsers.textContent = recentCount.toLocaleString();
    elements.countriesCount.textContent = countries.length.toLocaleString();
    elements.activeUsers.textContent = allUsers.length.toLocaleString();
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    elements.lastUpdateTime.textContent = now.toLocaleTimeString();
}

// Populate country filter
function populateCountryFilter() {
    const countries = [...new Set(allUsers.map(user => user.country).filter(Boolean))].sort();
    
    elements.countryFilter.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        elements.countryFilter.appendChild(option);
    });
}

// Filter users based on search and filters
function filterUsers() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const countryFilter = elements.countryFilter.value;
    const dateFilter = elements.dateFilter.value;
    
    filteredUsers = allUsers.filter(user => {
        // Search filter
        const matchesSearch = !searchTerm || 
            (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
            (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.country && user.country.toLowerCase().includes(searchTerm)) ||
            (user.userID && user.userID.toString().includes(searchTerm)) ||
            (user.accountID && user.accountID.toString().includes(searchTerm));
        
        // Country filter
        const matchesCountry = !countryFilter || user.country === countryFilter;
        
        // Date filter
        const matchesDate = filterByDate(user, dateFilter);
        
        return matchesSearch && matchesCountry && matchesDate;
    });
    
    currentPage = 1;
    renderContent();
}

// Date filtering
function filterByDate(user, dateFilter) {
    if (!dateFilter || !user.openDate) return true;
    
    try {
        const userDate = new Date(user.openDate);
        const today = new Date();
        
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const userDateStart = new Date(userDate.getFullYear(), userDate.getMonth(), userDate.getDate());
        
        switch(dateFilter) {
            case 'today':
                return userDateStart.getTime() === todayStart.getTime();
            case 'week':
                const oneWeekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
                return userDateStart >= oneWeekAgo;
            case 'month':
                const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                return userDateStart >= oneMonthAgo;
            default:
                return true;
        }
    } catch (error) {
        console.error('Date filtering error:', error);
        return true;
    }
}

// Render content based on current view
function renderContent() {
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderGridView();
    }
    updatePagination();
    updateShowingCount();
}

// Render table view
function renderTableView() {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = filteredUsers.slice(startIndex, endIndex);
    
    elements.usersTableBody.innerHTML = '';
    
    if (usersToShow.length === 0) {
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px; color: var(--gray-light);">
                    <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 style="margin-bottom: 10px; font-weight: 600;">No users found</h3>
                    <p>No users match your search criteria${elements.searchInput.value ? ` for "${elements.searchInput.value}"` : ''}</p>
                </td>
            </tr>
        `;
    } else {
        usersToShow.forEach(user => {
            const row = document.createElement('tr');
            const userInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
            
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${userInitial}</div>
                        <div class="user-details">
                            <h4>${user.firstName || ''} ${user.lastName || ''}</h4>
                            <div class="country">${user.country || 'Unknown'}</div>
                        </div>
                    </div>
                </td>
                <td>@${user.username || 'N/A'}</td>
                <td>
                    <span style="display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-globe"></i>
                        ${user.country || 'N/A'}
                    </span>
                </td>
                <td>${user.accountID || 'N/A'}</td>
                <td>${formatDate(user.openDate)}</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <button class="btn-view" onclick="viewUserDetails(${user.userID})" title="View details">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            elements.usersTableBody.appendChild(row);
        });
    }
}

// Render grid view
function renderGridView() {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = filteredUsers.slice(startIndex, endIndex);
    
    elements.usersGrid.innerHTML = '';
    
    if (usersToShow.length === 0) {
        elements.usersGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--gray-light); grid-column: 1 / -1;">
                <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;">
                    <i class="fas fa-search"></i>
                </div>
                <h3 style="margin-bottom: 10px; font-weight: 600;">No users found</h3>
                <p>No users match your search criteria${elements.searchInput.value ? ` for "${elements.searchInput.value}"` : ''}</p>
            </div>
        `;
    } else {
        usersToShow.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            const userInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
            
            card.innerHTML = `
                <div class="user-card-header">
                    <div class="user-card-avatar">${userInitial}</div>
                    <div class="user-card-info">
                        <h4>${user.firstName || ''} ${user.lastName || ''}</h4>
                        <p>@${user.username || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="user-card-details">
                    <div class="detail-item">
                        <span class="detail-label">User ID</span>
                        <span class="detail-value">${user.userID || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Country</span>
                        <span class="detail-value">${user.country || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Account ID</span>
                        <span class="detail-value">${user.accountID || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Join Date</span>
                        <span class="detail-value">${formatDate(user.openDate)}</span>
                    </div>
                </div>
                
                <div class="user-card-actions">
                    <button class="btn-view" onclick="viewUserDetails(${user.userID})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            `;
            
            elements.usersGrid.appendChild(card);
        });
    }
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Update showing count
function updateShowingCount() {
    const total = filteredUsers.length;
    const start = Math.min((currentPage - 1) * usersPerPage + 1, total);
    const end = Math.min(currentPage * usersPerPage, total);
    
    if (total === 0) {
        elements.showingCount.textContent = 'No users found';
    } else {
        elements.showingCount.textContent = `Showing ${start}-${end} of ${total} users`;
    }
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    currentPage += direction;
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    renderContent();
}

// View user details
async function viewUserDetails(userId) {
    try {
        const user = allUsers.find(u => u.userID === userId);
        
        if (user) {
            elements.userDetails.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding: 25px; background: rgba(255, 255, 255, 0.05); border-radius: var(--radius-lg);">
                    <div style="width: 80px; height: 80px; background: var(--gradient-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; box-shadow: var(--shadow-md);">
                        ${user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: var(--light); font-size: 24px;">${user.firstName || ''} ${user.lastName || ''}</h3>
                        <p style="margin: 0; color: var(--gray-light);">@${user.username || 'N/A'} • User ID: ${user.userID || 'N/A'}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-id-card"></i> User ID:</span>
                        <span class="user-detail-value">${user.userID || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-user"></i> Username:</span>
                        <span class="user-detail-value">${user.username || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-globe"></i> Country:</span>
                        <span class="user-detail-value">${user.country || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-address-card"></i> Account ID:</span>
                        <span class="user-detail-value">${user.accountID || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-calendar-plus"></i> Join Date:</span>
                        <span class="user-detail-value">${formatDate(user.openDate)}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-users"></i> User Type:</span>
                        <span class="user-detail-value">${user.userType || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-code-branch"></i> Parent ID:</span>
                        <span class="user-detail-value">${user.parentId || 'N/A'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label"><i class="fas fa-envelope"></i> Email Verified:</span>
                        <span class="user-detail-value">${user.emailVerified ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                
                ${user.currenciesPoliciesID ? `
                <div style="padding: 20px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-lg);">
                    <strong style="color: var(--primary-light);">Additional Info:</strong> Currencies Policy ID: ${user.currenciesPoliciesID}
                </div>
                ` : ''}
            `;
            
            elements.userModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showNotification('Error loading user details', 'error');
    }
}

// Close modal
function closeUserModal() {
    elements.userModal.style.display = 'none';
}

// Export to CSV
function exportToCSV() {
    if (filteredUsers.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    const headers = ['User ID', 'First Name', 'Last Name', 'Username', 'Country', 'Account ID', 'Join Date', 'User Type'];
    const csvData = filteredUsers.map(user => [
        user.userID || '',
        user.firstName || '',
        user.lastName || '',
        user.username || '',
        user.country || '',
        user.accountID || '',
        formatDate(user.openDate),
        user.userType || ''
    ]);
    
    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winx_trade_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification(`✅ Exported ${filteredUsers.length} users to CSV`, 'success');
}

// Start auto-refresh every 15 minutes
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing data from external API...');
        fetchFromExternalAPI();
    }, 900000); // 15 minutes
    
    console.log('✅ Auto-refresh enabled (every 15 minutes)');
    showNotification('Auto-refresh enabled: Data will update every 15 minutes', 'info');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

function showLoading(show) {
    elements.loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    
    elements.notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, type === 'error' ? 5000 : 3000);
}

// Make functions globally available
window.viewUserDetails = viewUserDetails;
window.switchView = switchView;

// Initialize with some sample data for demo
setTimeout(() => {
    if (allUsers.length === 0) {
        showNotification('💡 Tip: Use Ctrl+R to refresh data, Ctrl+E to export, Ctrl+/ to search', 'info');
    }
}, 3000);