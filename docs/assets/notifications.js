import { supabase, supabaseReady } from './supabaseClient.js';

export class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
    }

    async init(userId, userRole) {
        await supabaseReady;
        this.userId = userId;
        this.userRole = userRole;
        await this.loadNotifications();
        this.setupRealtimeSubscription();
    }

    async loadNotifications() {
        try {
            const { data, error } = await supabase
                .from('shipments')
                .select('*')
                .or(`shipper_id.eq.${this.userId},truck_owner_id.eq.${this.userId}`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            this.notifications = this.generateNotifications(data || []);
            this.unreadCount = this.notifications.filter(n => !n.read).length;
            this.updateUI();
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
    }

    generateNotifications(shipments) {
        const notifications = [];

        shipments.forEach(shipment => {
            const createdAt = new Date(shipment.created_at);
            const updatedAt = new Date(shipment.updated_at || shipment.created_at);

            if (this.userRole === 'shipper') {
                // Notifications for shippers
                if (shipment.status === 'accepted') {
                    notifications.push({
                        id: `${shipment.id}-accepted`,
                        type: 'success',
                        title: 'Shipment Accepted',
                        message: `Your shipment "${shipment.goods_description}" has been accepted by a carrier`,
                        time: updatedAt,
                        read: false,
                        shipmentId: shipment.id
                    });
                } else if (shipment.status === 'picked_up') {
                    notifications.push({
                        id: `${shipment.id}-picked_up`,
                        type: 'info',
                        title: 'Items Picked Up',
                        message: `Your shipment "${shipment.goods_description}" has been picked up`,
                        time: updatedAt,
                        read: false,
                        shipmentId: shipment.id
                    });
                } else if (shipment.status === 'in_transit') {
                    notifications.push({
                        id: `${shipment.id}-in_transit`,
                        type: 'info',
                        title: 'Shipment In Transit',
                        message: `Your shipment "${shipment.goods_description}" is on the way`,
                        time: updatedAt,
                        read: false,
                        shipmentId: shipment.id
                    });
                } else if (shipment.status === 'delivered') {
                    notifications.push({
                        id: `${shipment.id}-delivered`,
                        type: 'success',
                        title: 'Shipment Delivered',
                        message: `Your shipment "${shipment.goods_description}" has been delivered`,
                        time: updatedAt,
                        read: false,
                        shipmentId: shipment.id
                    });
                }
            } else if (this.userRole === 'truck_owner') {
                // Notifications for truck owners
                if (shipment.status === 'pending' && !shipment.truck_owner_id) {
                    notifications.push({
                        id: `${shipment.id}-new`,
                        type: 'info',
                        title: 'New Load Available',
                        message: `New shipment: ${shipment.goods_description} (${shipment.weight_kg}kg)`,
                        time: createdAt,
                        read: false,
                        shipmentId: shipment.id
                    });
                }
            }
        });

        return notifications.sort((a, b) => b.time - a.time);
    }

    setupRealtimeSubscription() {
        supabase
            .channel('shipment-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'shipments' },
                () => this.loadNotifications()
            )
            .subscribe();
    }

    updateUI() {
        const countEl = document.querySelector('.notification-count');
        const bellEl = document.querySelector('.notification-bell');
        
        if (countEl) {
            countEl.textContent = this.unreadCount;
            countEl.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }

        if (bellEl && !bellEl.dataset.listenerAdded) {
            bellEl.addEventListener('click', () => this.showNotificationPanel());
            bellEl.dataset.listenerAdded = 'true';
        }
    }

    showNotificationPanel() {
        // Remove existing panel if any
        const existing = document.querySelector('.notification-panel');
        if (existing) {
            existing.remove();
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <button class="close-notifications">&times;</button>
            </div>
            <div class="notification-list">
                ${this.notifications.length === 0 ? 
                    '<div class="no-notifications">No notifications</div>' :
                    this.notifications.map(n => `
                        <div class="notification-item ${n.read ? 'read' : 'unread'}">
                            <div class="notification-icon ${n.type}">
                                <i class="fas fa-${n.type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                            </div>
                            <div class="notification-content">
                                <h4>${n.title}</h4>
                                <p>${n.message}</p>
                                <span class="notification-time">${this.getTimeAgo(n.time)}</span>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        document.body.appendChild(panel);

        // Close button
        panel.querySelector('.close-notifications').addEventListener('click', () => {
            panel.remove();
        });

        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', function closePanel(e) {
                if (!panel.contains(e.target) && !e.target.closest('.notification-bell')) {
                    panel.remove();
                    document.removeEventListener('click', closePanel);
                }
            });
        }, 100);
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}

export const notificationManager = new NotificationManager();
