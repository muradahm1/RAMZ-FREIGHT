// Notification System with Truck Horn Sound
class NotificationSystem {
  constructor() {
    this.permission = 'default';
    this.sounds = {
      newShipment: this.createTruckHornSound(),
      accepted: this.createTruckHornSound(1.2),
      delivered: this.createTruckHornSound(0.8)
    };
    this.init();
  }

  async init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }
    }
  }

  // Create truck horn sound using Web Audio API
  createTruckHornSound(pitch = 1.0) {
    return () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Truck horn frequency (around 200-400 Hz)
      oscillator.frequency.setValueAtTime(300 * pitch, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(250 * pitch, audioContext.currentTime + 0.3);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.type = 'sawtooth';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    };
  }

  async notify(title, options = {}) {
    const defaultOptions = {
      icon: './assets/images/icon.png',
      badge: './assets/images/icon.png',
      vibrate: [200, 100, 200],
      tag: 'ramz-freight',
      requireInteraction: false,
      ...options
    };

    // Play sound
    if (options.sound && this.sounds[options.sound]) {
      try {
        this.sounds[options.sound]();
      } catch (error) {
        console.log('Sound play failed:', error);
      }
    }

    // Show notification
    if (this.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Use service worker for persistent notifications
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        // Fallback to regular notification
        new Notification(title, defaultOptions);
      }
    }

    // Show in-app notification banner
    this.showBanner(title, options.body);
  }

  showBanner(title, body) {
    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">🚛</div>
        <div class="notification-text">
          <strong>${title}</strong>
          <p>${body || ''}</p>
        </div>
        <button class="notification-close">&times;</button>
      </div>
    `;
    
    banner.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      min-width: 300px;
      max-width: 400px;
      border-left: 4px solid #ff6b35;
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .notification-icon {
        font-size: 32px;
      }
      .notification-text {
        flex: 1;
      }
      .notification-text strong {
        display: block;
        margin-bottom: 4px;
        color: #ff6b35;
      }
      .notification-text p {
        margin: 0;
        font-size: 14px;
        color: #ccc;
      }
      .notification-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        line-height: 1;
      }
      .notification-close:hover {
        color: #fff;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(banner);

    banner.querySelector('.notification-close').addEventListener('click', () => {
      banner.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => banner.remove(), 300);
    });

    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      }
    }, 5000);
  }

  // Predefined notification types
  newShipment(shipmentData) {
    this.notify('New Shipment Request! 🚛', {
      body: `From: ${shipmentData.origin} to ${shipmentData.destination}`,
      sound: 'newShipment',
      data: { type: 'new_shipment', shipmentId: shipmentData.id }
    });
  }

  shipmentAccepted(shipmentData) {
    this.notify('Shipment Accepted! ✅', {
      body: `Your shipment has been accepted by ${shipmentData.driverName}`,
      sound: 'accepted',
      data: { type: 'accepted', shipmentId: shipmentData.id }
    });
  }

  shipmentDelivered(shipmentData) {
    this.notify('Shipment Delivered! 🎉', {
      body: `Your shipment to ${shipmentData.destination} has been delivered`,
      sound: 'delivered',
      data: { type: 'delivered', shipmentId: shipmentData.id }
    });
  }

  locationUpdate(driverName) {
    this.notify('Location Updated 📍', {
      body: `${driverName} is on the way`,
      sound: null
    });
  }
}

// Export singleton
const notificationSystem = new NotificationSystem();
window.notificationSystem = notificationSystem;

// Service Worker notification click handler
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'notification-click') {
      // Handle notification click
      const data = event.data.notification;
      if (data.type === 'new_shipment') {
        window.location.href = './docs/trucks-dashboard-cheak/truck-dashboard.html';
      } else if (data.type === 'accepted' || data.type === 'delivered') {
        window.location.href = './docs/live-tracking/live-tracking.html';
      }
    }
  });
}
