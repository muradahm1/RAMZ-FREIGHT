import { supabase, supabaseReady } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    await supabaseReady;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../shippers-login/shippers-login.html';
        return;
    }

    loadHistory();

    document.getElementById('statusFilter').addEventListener('change', loadHistory);
    document.getElementById('dateFilter').addEventListener('change', loadHistory);
});

async function loadHistory() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        let query = supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', session.user.id)
            .order('created_at', { ascending: false });

        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: shipments, error } = await query;
        if (error) throw error;

        if (!shipments || shipments.length === 0) {
            container.innerHTML = '<div class="no-data"><p>No shipment history found</p></div>';
            return;
        }

        container.innerHTML = shipments.map(s => `
            <div class="shipment-card">
                <div class="shipment-header">
                    <span class="shipment-id">#${s.id.slice(-8)}</span>
                    <span class="status-badge status-${s.status}">${s.status.toUpperCase()}</span>
                </div>
                <div class="shipment-details">
                    <p><i class="fas fa-box"></i> ${s.goods_description || 'N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${s.origin_address} → ${s.destination_address}</p>
                    <p><i class="fas fa-weight"></i> ${s.weight_kg || 0} kg</p>
                    <p><i class="fas fa-calendar"></i> ${new Date(s.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<div class="no-data"><p>Failed to load history</p></div>';
    }
}
