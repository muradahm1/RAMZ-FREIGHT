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

    document.getElementById('shipmentFilter').addEventListener('change', loadBids);
    document.getElementById('sortFilter').addEventListener('change', loadBids);
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

async function loadBids() {
    const container = document.getElementById('bidsContainer');
    container.innerHTML = '<div class="loading">Loading bids...</div>';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Get shipments with accepted status (these have bids)
        const response = await fetch(`${backendUrl}/shipments`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const { shipments } = await response.json();
        
        const acceptedShipments = shipments.filter(s => s.status === 'accepted' || s.status === 'in_transit');

        if (!acceptedShipments || acceptedShipments.length === 0) {
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

        container.innerHTML = acceptedShipments.map(s => `
            <div class="bid-card">
                <div class="bid-header">
                    <div class="shipment-info">
                        <h4>#${s.id.slice(-8)} - ${s.goods_description}</h4>
                        <p><i class="fas fa-route"></i> ${s.origin_address} → ${s.destination_address}</p>
                    </div>
                    <span class="status-badge status-${s.status}">${s.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                
                <div class="carrier-bid">
                    <div class="carrier-info">
                        <div class="carrier-avatar">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div class="carrier-details">
                            <h5>Carrier Accepted</h5>
                            <div class="carrier-rating">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star-half-alt"></i>
                                <span>4.5 (120 reviews)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bid-details">
                        <div class="bid-price">
                            <span class="price-label">Estimated Cost</span>
                            <span class="price-value">$${(s.weight_kg * 0.5).toFixed(2)}</span>
                        </div>
                        <div class="bid-actions">
                            <button class="btn-secondary" onclick="window.location.href='../live-tracking/live-tracking.html'">
                                <i class="fas fa-map-marked-alt"></i> Track
                            </button>
                            <button class="btn-primary" onclick="alert('Contact feature coming soon!')">
                                <i class="fas fa-phone"></i> Contact
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading bids:', error);
        container.innerHTML = '<div class="no-data"><p>Failed to load bids</p></div>';
    }
}
