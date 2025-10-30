import { supabase, backendUrl } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for supabase to load
    let attempts = 0;
    while (!supabase && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!supabase) {
        alert('Failed to load Supabase. Please refresh the page.');
        return;
    }
    
    const authorized = await checkUserRole();
    if (authorized) {
        initializeDashboard();
    }
});

/**
 * Checks if the current user is authenticated and has an admin/management role.
 * Redirects to the homepage if not authorized.
 * @returns {Promise<boolean>} - True if the user is authorized, false otherwise.
 */
async function checkUserRole() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        console.error('Session error or no session, redirecting to homepage.');
        window.location.replace('../homepage/homepage.html');
        return false;
    }

    const user = session.user;
    if (!user) {
        console.log('No user found, redirecting to homepage.');
        window.location.replace('../homepage/homepage.html');
        return false;
    }

    // Fetch user role from the profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_role, full_name')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error('Error fetching profile or profile not found. Redirecting.', profileError?.message);
        alert('Access Denied: Could not verify your user profile.');
        window.location.replace('../homepage/homepage.html');
        return false;
    }

    const allowedRoles = ['admin', 'management', 'manager'];
    if (!allowedRoles.includes(profile.user_role)) {
        console.warn(`Access denied for role: ${profile.user_role}. Redirecting.`);
        alert('Access Denied: You do not have permission to view this page.');
        // Redirect to a more appropriate page if one exists, e.g., a user dashboard
        window.location.replace('../homepage/homepage.html');
        return false;
    }

    // User is authorized, update UI with user info
    document.querySelector('.user-name').textContent = profile.full_name || 'Admin';
    document.querySelector('.user-role').textContent = profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1);

    return true;
}

/**
 * Initializes the dashboard by fetching data and setting up event listeners.
 */
function initializeDashboard() {
    console.log('User authorized. Initializing management dashboard.');
    setupEventListeners();
    loadDashboardData();
}

/**
 * Sets up event listeners for dashboard interactions (e.g., logout).
 */
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error.message);
                alert('Failed to log out. Please try again.');
            } else {
                // Clear local storage and redirect
                localStorage.clear();
                window.location.replace('../homepage/homepage.html');
            }
        });
    }

    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active link
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
            link.parentElement.classList.add('active');

            // Show target page, hide others
            document.querySelectorAll('.dashboard-page').forEach(page => {
                page.style.display = page.id === `${targetId}-section` ? 'block' : 'none';
            });

            // Load data for the new page if needed
            if (targetId === 'shipments') loadAllShipments();
            else if (targetId === 'trucks') loadTrucks();
            else if (targetId === 'drivers') loadDrivers();
            else if (targetId === 'shippers') loadShippers();
            else if (targetId === 'finance') loadFinance();
            else if (targetId === 'reports') loadReports();
        });
    });
}

/**
 * Fetches and displays all necessary data for the dashboard.
 */
async function loadDashboardData() {
    // Use Promise.all to fetch data in parallel for better performance
    const [stats, recentShipments] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentShipments()
    ]);

    // Populate stats cards
    if (stats) {
        document.getElementById('statTotalShipments').textContent = stats.totalShipments || 0;
        document.getElementById('statActiveTrucks').textContent = stats.activeTrucks || 0;
        document.getElementById('statPendingShipments').textContent = stats.pendingShipments || 0;
        document.getElementById('statMonthlyRevenue').textContent = `${(stats.monthlyRevenue || 0).toFixed(2)} ETB`;
    }

    // Populate recent activity
    const activityList = document.getElementById('activityList');
    if (recentShipments && recentShipments.length > 0) {
        activityList.innerHTML = recentShipments.map(s => `
            <div class="activity-item">
                <div class="activity-icon ${s.status === 'delivered' ? 'success' : 'info'}">
                    <i class="fas fa-${s.status === 'delivered' ? 'check-circle' : 'truck'}"></i>
                </div>
                <div class="activity-details">
                    <p>Shipment #${s.id.substring(0, 8)} - ${s.status}</p>
                    <span class="activity-time">${new Date(s.created_at).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    } else {
        activityList.innerHTML = '<p style="text-align:center; padding: 20px;">No recent activity</p>';
    }

    // Populate recent shipments table
    const tableBody = document.getElementById('recentShipmentsTable');
    if (recentShipments && recentShipments.length > 0) {
        tableBody.innerHTML = recentShipments.map(shipment => `
            <tr>
              <td>#${shipment.id.substring(0, 8)}</td>
              <td>${shipment.shipper_id ? shipment.shipper_id.substring(0, 12) + '...' : 'N/A'}</td>
              <td>${shipment.destination_address}</td>
              <td>${shipment.truck_owner_id ? shipment.truck_owner_id.substring(0, 12) + '...' : 'N/A'}</td>
              <td><span class="status-badge ${shipment.status}">${shipment.status}</span></td>
              <td>
                <button class="action-btn view" data-shipment-id="${shipment.id}"><i class="fas fa-eye"></i></button>
              </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No shipments found</td></tr>';
    }

    addEventListenersToViewButtons();
}

/**
 * Fetches and displays all shipments for the main shipments page.
 */
async function loadAllShipments() {
    const tableBody = document.querySelector('#all-shipments-table tbody');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading shipments...</td></tr>';

    const { data, error } = await supabase
        .from('shipments')
        .select('id, shipper_id, origin_address, destination_address, status, created_at, profiles(full_name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all shipments:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Failed to load shipments.</td></tr>';
        return;
    }

    tableBody.innerHTML = ''; // Clear loading row
    data.forEach(shipment => {
        const row = `
            <tr>
                <td data-shipment-id="${shipment.id}">#${shipment.id.substring(0, 8)}</td>
                <td>${shipment.profiles?.full_name || 'N/A'}</td>
                <td>${shipment.origin_address}</td>
                <td>${shipment.destination_address}</td>
                <td><span class="status-badge ${shipment.status}">${shipment.status}</span></td>
                <td>${new Date(shipment.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn view" data-shipment-id="${shipment.id}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });

    addEventListenersToViewButtons();
}

/**
 * Adds click handlers to all "view" buttons on the page.
 */
function addEventListenersToViewButtons() {
    document.querySelectorAll('.action-btn.view').forEach(button => {
        button.addEventListener('click', () => {
            const shipmentId = button.dataset.shipmentId;
            console.log('View button clicked for shipment:', shipmentId);
            showShipmentModal(shipmentId);
        });
    });
    
    // Add edit and delete button handlers
    document.querySelectorAll('.action-btn.edit').forEach(button => {
        button.addEventListener('click', () => {
            alert('Edit functionality coming soon!');
        });
    });
    
    document.querySelectorAll('.action-btn.delete').forEach(button => {
        button.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this shipment?')) {
                alert('Delete functionality coming soon!');
            }
        });
    });
}

/**
 * Fetches shipment details and displays them in a modal.
 * @param {string} shipmentId - The UUID of the shipment to display.
 */
async function showShipmentModal(shipmentId) {
    const modal = document.getElementById('shipment-modal');
    const modalBody = document.getElementById('modal-body-content');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<p>Loading details...</p>';

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
        modalBody.innerHTML = '<p style="color: red;">Authentication error. Please log in again.</p>';
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/admin/shipments/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const { shipment } = await response.json();
        
        modalBody.innerHTML = `
            <div class="detail-grid">
                <p><strong>Shipment ID:</strong> ${shipment.id}</p>
                <p><strong>Status:</strong> <span class="status-badge ${shipment.status}">${shipment.status}</span></p>
                <p><strong>Origin:</strong> ${shipment.origin_address}</p>
                <p><strong>Destination:</strong> ${shipment.destination_address}</p>
                <p><strong>Pickup Date:</strong> ${new Date(shipment.pickup_datetime).toLocaleString()}</p>
                <p><strong>Payment Amount:</strong> $${shipment.payment_amount || 'N/A'}</p>
                <hr/>
                <p><strong>Shipper:</strong> ${shipment.shipper?.full_name || 'N/A'}</p>
                <p><strong>Shipper Contact:</strong> ${shipment.shipper?.email || ''} / ${shipment.shipper?.phone || ''}</p>
                <hr/>
                <p><strong>Truck Owner:</strong> ${shipment.truck_owner?.full_name || 'Not Assigned'}</p>
                <p><strong>Truck Owner Contact:</strong> ${shipment.truck_owner ? (shipment.truck_owner.email || '') + ' / ' + (shipment.truck_owner.phone || '') : 'N/A'}</p>
                <p><strong>Vehicle:</strong> ${shipment.vehicle ? `${shipment.vehicle.vehicle_model} (${shipment.vehicle.license_plate})` : 'N/A'}</p>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching shipment details:', error);
        modalBody.innerHTML = `<p style="color: red;">Could not load shipment details. ${error.message}</p>`;
    }
}

// Close modal logic
document.querySelectorAll('.close-modal-btn, .modal-container').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el) { // Only close if the background or close button is clicked
            document.getElementById('shipment-modal').style.display = 'none';
        }
    });
});

async function fetchDashboardStats() {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) console.error('Error fetching dashboard stats:', error);
    return data ? data[0] : null;
}

async function fetchRecentShipments() {
    const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    if (error) console.error('Error fetching recent shipments:', error);
    return data;
}

async function loadTrucks() {
    const tbody = document.querySelector('#trucks-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    
    const { data, error } = await supabase
        .from('vehicles')
        .select('*');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error loading vehicles</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(v => `
        <tr>
            <td>${v.license_plate || 'N/A'}</td>
            <td>${v.vehicle_model || 'N/A'}</td>
            <td>${v.owner_id ? v.owner_id.substring(0, 12) + '...' : 'N/A'}</td>
            <td>${v.capacity_kg || 'N/A'}</td>
            <td><span class="status-badge delivered">Active</span></td>
            <td><button class="action-btn view"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');
}

async function loadDrivers() {
    const tbody = document.querySelector('#drivers-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No truck owners table</td></tr>';
}

async function loadShippers() {
    const tbody = document.querySelector('#shippers-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    
    const { data, error } = await supabase
        .from('shippers')
        .select('*');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error loading shippers</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${s.full_name}</td>
            <td>${s.company_name || 'N/A'}</td>
            <td>${s.phone || 'N/A'}</td>
            <td>${s.email || 'N/A'}</td>
            <td>N/A</td>
            <td><button class="action-btn view"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');
}

async function loadFinance() {
    const { data, error } = await supabase
        .from('shipments')
        .select('payment_amount, status, created_at')
        .eq('status', 'delivered');
    
    if (!error && data) {
        const total = data.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
        document.getElementById('totalRevenue').textContent = `${total.toFixed(2)} ETB`;
    }
    
    const tbody = document.querySelector('#payments-table tbody');
    const { data: payments } = await supabase
        .from('shipments')
        .select('id, payment_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
    
    tbody.innerHTML = payments?.map(p => `
        <tr>
            <td>#${p.id.substring(0, 8)}</td>
            <td>${p.payment_amount || 0} ETB</td>
            <td><span class="status-badge ${p.status}">${p.status}</span></td>
            <td>${new Date(p.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;">No data</td></tr>';
}

async function loadReports() {
    const { data } = await supabase
        .from('shipments')
        .select('payment_amount, created_at')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    
    if (data) {
        document.getElementById('monthlyShipments').textContent = data.length;
        const revenue = data.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
        document.getElementById('monthlyRevenueReport').textContent = `${revenue.toFixed(2)} ETB`;
    }
}