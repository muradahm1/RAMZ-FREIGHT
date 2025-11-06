import { supabase, supabaseReady, backendUrl } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    await supabaseReady;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../shippers-login/shippers-login.html';
        return;
    }

    await loadShipments(session);
    loadBids();

    document.getElementById('shipmentFilter').addEventListener('change', () => filterAndSortBids());
    document.getElementById('sortFilter').addEventListener('change', () => filterAndSortBids());
});

async function loadShipments(session) {
    try {
        const response = await fetch(`${backendUrl}/shipments`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const { shipments } = await response.json();
        
        const select = document.getElementById('shipmentFilter');
        select.innerHTML = '<option value="all">All Shipments</option>' +
            shipments.map(s => `<option value="${s.id}">#${s.id.slice(-8)} - ${s.goods_description}</option>`).join('');
    } catch (error) {
        console.error('Error loading shipments:', error);
    }
}

let allBids = [];
let allCarriers = {};

async function loadBids() {
    const container = document.getElementById('bidsContainer');
    container.innerHTML = '<div class="loading">Loading bids...</div>';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '../shippers-login/shippers-login.html';
            return;
        }
        
        const response = await fetch(`${backendUrl}/shipments`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch shipments');
        
        const { shipments } = await response.json();
        allBids = shipments.filter(s => s.status === 'accepted' || s.status === 'in_transit');

        if (!allBids || allBids.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-gavel" style="font-size: 3rem; color: var(--text-lighter); margin-bottom: 1rem;"></i>
                    <p>No bids yet. Create a shipment to receive offers from carriers!</p>
                    <a href="../create-shipment/create-shipment.html" class="btn-primary" style="margin-top: 1rem; text-decoration: none;">
                        <i class="fas fa-plus"></i> Create Shipment
                    </a>
                </div>
            `;
            return;
        }

        // Get carrier info
        const carrierIds = [...new Set(allBids.map(s => s.truck_owner_id).filter(Boolean))];
        allCarriers = await getCarrierInfo(carrierIds);
        
        filterAndSortBids();
    } catch (error) {
        console.error('Error loading bids:', error);
        container.innerHTML = `<div class="no-data"><p>Failed to load bids: ${escapeHtml(error.message)}</p></div>`;
    }
}

function filterAndSortBids() {
    const container = document.getElementById('bidsContainer');
    const shipmentFilter = document.getElementById('shipmentFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    let filtered = [...allBids];
    
    // Apply shipment filter
    if (shipmentFilter !== 'all') {
        filtered = filtered.filter(s => s.id === shipmentFilter);
    }
    
    // Apply sort
    if (sortFilter === 'price') {
        filtered.sort((a, b) => (a.weight_kg * 0.5) - (b.weight_kg * 0.5));
    } else if (sortFilter === 'date') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-data"><p>No bids match your filters</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(s => {
        const carrier = allCarriers[s.truck_owner_id] || { name: 'Unknown Carrier', email: 'N/A' };
        const safeId = escapeHtml(s.id.slice(-8));
        const safeDesc = escapeHtml(s.goods_description || 'N/A');
        const safeOrigin = escapeHtml(s.origin_address || 'N/A');
        const safeDest = escapeHtml(s.destination_address || 'N/A');
        const safeCarrier = escapeHtml(carrier.name);
        const safeStatus = escapeHtml(s.status.replace('_', ' ').toUpperCase());
        const cost = (s.weight_kg * 0.5).toFixed(2);
        
        return `
        <div class="bid-card">
            <div class="bid-header">
                <div class="shipment-info">
                    <h4>#${safeId} - ${safeDesc}</h4>
                    <p><i class="fas fa-route"></i> ${safeOrigin} → ${safeDest}</p>
                </div>
                <span class="status-badge status-${s.status}">${safeStatus}</span>
            </div>
            
            <div class="carrier-bid">
                <div class="carrier-info">
                    <div class="carrier-avatar">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="carrier-details">
                        <h5>${safeCarrier}</h5>
                        <p style="font-size: 0.9rem; color: var(--text-lighter);">${escapeHtml(carrier.email)}</p>
                    </div>
                </div>
                
                <div class="bid-details">
                    <div class="bid-price">
                        <span class="price-label">Estimated Cost</span>
                        <span class="price-value">$${cost}</span>
                    </div>
                    <div class="bid-actions">
                        <button class="btn-secondary" onclick="window.location.href='../live-tracking/live-tracking.html'">
                            <i class="fas fa-map-marked-alt"></i> Track
                        </button>
                        <button class="btn-primary" onclick="window.open('mailto:${escapeHtml(carrier.email)}?subject=Shipment%20%23${safeId}', '_blank')">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

async function getCarrierInfo(carrierIds) {
    if (!carrierIds.length) return {};
    
    try {
        // Get user info from auth.users via Supabase admin
        const carriers = {};
        
        for (const id of carrierIds) {
            try {
                const { data: { user }, error } = await supabase.auth.admin.getUserById(id);
                if (!error && user) {
                    carriers[id] = {
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Carrier',
                        email: user.email || 'N/A'
                    };
                }
            } catch (e) {
                // Fallback: try drivers table
                const { data: driver } = await supabase
                    .from('drivers')
                    .select('full_name, email')
                    .eq('id', id)
                    .single();
                
                if (driver) {
                    carriers[id] = {
                        name: driver.full_name || 'Carrier',
                        email: driver.email || 'N/A'
                    };
                }
            }
        }
        
        return carriers;
    } catch (error) {
        console.error('Error fetching carrier info:', error);
        return {};
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
