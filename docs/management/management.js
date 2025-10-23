import { supabase, supabaseReady } from '../assets/supabaseClient.js';
import { ADMIN_CONFIG } from '../assets/adminAccess.js';

// Internal Management Dashboard - Admin Access
document.addEventListener('DOMContentLoaded', async () => {
    // Check admin access
    if (!ADMIN_CONFIG.hasAdminAccess()) {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Access Denied</h2><p>Internal Admin Access Required</p></div>';
        return;
    }
    
    // Wait for Supabase to be ready
    await supabaseReady;
    
    // Set admin user info
    document.querySelector('.user-name').textContent = 'System Admin';
    document.querySelector('.user-role').textContent = 'Administrator';
    
    // Load dashboard data
    await loadDashboardData();
    
    // Admin logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        ADMIN_CONFIG.revokeAccess();
        window.location.href = '../homepage/homepage.html';
    });
    
    // Real-time updates
    setInterval(loadDashboardData, 30000);
});

async function loadDashboardData() {
    try {
        const [shipmentsResult, vehiclesResult] = await Promise.allSettled([
            supabase.from('shipments').select('*'),
            supabase.from('vehicles').select('*')
        ]);
        
        const shipments = shipmentsResult.status === 'fulfilled' ? shipmentsResult.value.data : [];
        const vehicles = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value.data : [];
        
        updateStats(shipments, vehicles);
        await updateRecentShipments(shipments);
        await updateRecentActivity(shipments);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function updateRecentActivity(shipments) {
    const activityList = document.getElementById('activityList');
    if (!shipments?.length) {
        activityList.innerHTML = '<div class="activity-item"><div class="activity-icon info"><i class="fas fa-info-circle"></i></div><div class="activity-details"><p>No recent activity</p><span class="activity-time">-</span></div></div>';
        return;
    }
    
    const recent = shipments.slice(-5).reverse();
    const activities = recent.map(s => {
        const icon = s.status === 'delivered' ? 'success' : s.status === 'pending' ? 'warning' : 'primary';
        const iconClass = s.status === 'delivered' ? 'fa-check-circle' : s.status === 'pending' ? 'fa-clock' : 'fa-truck';
        const message = s.status === 'delivered' ? `Shipment #${s.id.slice(-8)} delivered successfully` : 
                       s.status === 'pending' ? `Shipment #${s.id.slice(-8)} awaiting assignment` :
                       `Shipment #${s.id.slice(-8)} in progress`;
        const time = getTimeAgo(s.created_at);
        return `
        <div class="activity-item">
            <div class="activity-icon ${icon}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="activity-details">
                <p>${message}</p>
                <span class="activity-time">${time}</span>
            </div>
        </div>
        `;
    });
    activityList.innerHTML = activities.join('');
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function updateStats(shipments, vehicles) {
    const totalShipments = shipments?.length || 0;
    const activeTrucks = vehicles?.filter(v => v.status === 'approved').length || 0;
    const pendingShipments = shipments?.filter(s => s.status === 'pending').length || 0;
    const revenue = (totalShipments * 1500).toLocaleString();
    
    document.getElementById('totalShipments').textContent = totalShipments;
    document.getElementById('activeTrucks').textContent = activeTrucks;
    document.getElementById('pendingShipments').textContent = pendingShipments;
    document.getElementById('monthlyRevenue').textContent = `₦${revenue}`;
}

async function updateRecentShipments(shipments) {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!shipments?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No shipments found</td></tr>';
        return;
    }
    
    const recent = shipments.slice(-5).reverse();
    const shippersMap = await getShippersMap();
    const driversMap = await getDriversMap();
    
    tbody.innerHTML = recent.map(s => {
        const shipperName = shippersMap[s.shipper_id] || 'Unknown Shipper';
        const driverName = driversMap[s.driver_id] || 'Unassigned';
        return `
        <tr>
            <td>#${s.id.slice(-8)}</td>
            <td>${shipperName}</td>
            <td>${s.origin_address || 'N/A'} to ${s.destination_address || 'N/A'}</td>
            <td>${driverName}</td>
            <td><span class="status-badge ${s.status}">${s.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn view"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `}).join('');
}

async function getShippersMap() {
    try {
        const { data } = await supabase.from('shippers').select('id, company_name');
        return data?.reduce((map, s) => ({ ...map, [s.id]: s.company_name }), {}) || {};
    } catch { return {}; }
}

async function getDriversMap() {
    try {
        const { data } = await supabase.from('drivers').select('id, full_name');
        return data?.reduce((map, d) => ({ ...map, [d.id]: d.full_name }), {}) || {};
    } catch { return {}; }
}