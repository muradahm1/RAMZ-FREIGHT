export function initHamburgerMenu(menuItems, userInfo) {
    // Check if hamburger already exists
    if (document.querySelector('.hamburger-menu-icon')) {
        return { logoutBtn: document.querySelector('#menuLogoutBtn'), close: () => {} };
    }
    
    // Create hamburger icon
    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger-menu-icon';
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    // Create slide menu
    const slideMenu = document.createElement('div');
    slideMenu.className = 'slide-menu';
    
    // Menu header
    const menuHeader = `
        <div class="slide-menu-header">
            <h2>${userInfo.name || 'User'}</h2>
            <p>${userInfo.role || 'Dashboard'}</p>
        </div>
    `;

    // Menu items
    const menuItemsHTML = menuItems.map(item => `
        <a href="${item.href}" class="menu-item ${item.active ? 'active' : ''}">
            <div class="menu-item-icon">
                <i class="${item.icon}"></i>
            </div>
            <div class="menu-item-content">
                <div class="menu-item-title">${item.title}</div>
                ${item.desc ? `<div class="menu-item-desc">${item.desc}</div>` : ''}
            </div>
        </a>
    `).join('');

    // Menu footer
    const menuFooter = `
        <div class="slide-menu-footer">
            <button class="menu-logout-btn" id="menuLogoutBtn">
                <i class="fas fa-sign-out-alt"></i>
                Logout
            </button>
        </div>
    `;

    slideMenu.innerHTML = `
        ${menuHeader}
        <div class="slide-menu-items">
            ${menuItemsHTML}
        </div>
        ${menuFooter}
    `;

    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(slideMenu);

    // Add hamburger to header (prioritize header-actions for shipper, header-right for truck)
    const headerActions = document.querySelector('.header-actions') || document.querySelector('.header-right');
    if (headerActions) {
        // Remove any existing hamburger icons first
        const existingHamburger = headerActions.querySelector('.hamburger-menu-icon');
        if (existingHamburger) existingHamburger.remove();
        headerActions.insertBefore(hamburger, headerActions.firstChild);
    }

    // Toggle menu
    function toggleMenu() {
        hamburger.classList.toggle('active');
        slideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = slideMenu.classList.contains('active') ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Return logout button for external handler
    return {
        logoutBtn: slideMenu.querySelector('#menuLogoutBtn'),
        close: toggleMenu
    };
}
