// Hamburger Menu Functionality
export function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    // For dashboards with sidebar (truck dashboard)
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
            }
        });

        // Close menu on window resize if desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
            }
        });
    }
    
    // For dashboards without sidebar (shipper dashboard)
    if (hamburger && !sidebar) {
        // Create mobile menu if it doesn't exist
        if (!mobileMenu) {
            createMobileMenu();
        }
        
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            const menu = document.querySelector('.mobile-menu');
            if (menu) {
                menu.classList.toggle('active');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.querySelector('.mobile-menu');
            if (menu && !menu.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                menu.classList.remove('active');
            }
        });

        // Close menu on window resize if desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                hamburger.classList.remove('active');
                const menu = document.querySelector('.mobile-menu');
                if (menu) {
                    menu.classList.remove('active');
                }
            }
        });
    }
}

function createMobileMenu() {
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.innerHTML = `
        <div class="mobile-menu-content">
            <div class="mobile-menu-header">
                <h3>🚛 RAMZ-FREIGHT</h3>
                <p>Shipper Portal</p>
            </div>
            <nav class="mobile-menu-nav">
                <a href="../shippers-dashboard/shippers-dashboard.html" class="mobile-menu-item">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
                <a href="../create-shipment/create-shipment.html" class="mobile-menu-item">
                    <i class="fas fa-plus-circle"></i>
                    <span>Create Shipment</span>
                </a>
                <a href="../live-tracking/live-tracking.html" class="mobile-menu-item">
                    <i class="fas fa-satellite"></i>
                    <span>Track Shipments</span>
                </a>
                <a href="shipment-history.html" class="mobile-menu-item">
                    <i class="fas fa-history"></i>
                    <span>History</span>
                </a>
                <a href="bids.html" class="mobile-menu-item">
                    <i class="fas fa-gavel"></i>
                    <span>View Bids</span>
                </a>
                <a href="shipper-settings.html" class="mobile-menu-item">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </a>
            </nav>
        </div>
    `;
    document.body.appendChild(mobileMenu);
}