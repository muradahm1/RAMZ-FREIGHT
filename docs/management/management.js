import { supabase } from '../assets/supabaseClient.js';
import { ADMIN_CONFIG } from '../assets/adminAccess.js';

// Internal Management Dashboard - Admin Access
document.addEventListener('DOMContentLoaded', async () => {
    // Check admin access
    if (!ADMIN_CONFIG.hasAdminAccess()) {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Access Denied</h2><p>Internal Admin Access Required</p></div>';
        return;
    }
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
        updateRecentShipments(shipments);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function updateStats(shipments, vehicles) {
    const totalShipments = shipments?.length || 0;
    const activeTrucks = vehicles?.filter(v => v.status === 'approved').length || 0;
    const pendingShipments = shipments?.filter(s => s.status === 'pending').length || 0;
    const revenue = (totalShipments * 1500).toLocaleString();
    
    document.querySelector('.total-shipments + .stat-info h3').textContent = totalShipments;
    document.querySelector('.active-trucks + .stat-info h3').textContent = activeTrucks;
    document.querySelector('.pending-shipments + .stat-info h3').textContent = pendingShipments;
    document.querySelector('.revenue + .stat-info h3').textContent = `₦${revenue}`;
}

function updateRecentShipments(shipments) {
    const tbody = document.querySelector('.data-table tbody');
    if (!shipments?.length) {
        tbody.innerHTML = '<tr><td colspan="6">No shipments found</td></tr>';
        return;
    }
    
    const recent = shipments.slice(-5).reverse();
    tbody.innerHTML = recent.map(s => `
        <tr>
            <td>#${s.id.slice(-8)}</td>
            <td>Shipper</td>
            <td>${s.origin_address} to ${s.destination_address}</td>
            <td>Driver</td>
            <td><span class="status-badge ${s.status}">${s.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn view"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}