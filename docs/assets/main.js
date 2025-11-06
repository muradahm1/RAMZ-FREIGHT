
// main.js - Global JS for RAMZ-FREIGHT

// Clean URLs - Remove .html from address bar
(function() {
  if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace('.html', '');
    window.history.replaceState({}, '', cleanPath + window.location.search + window.location.hash);
  }
})();

// Example: Show a toast notification
function showToast(message, type = 'info') {
	let toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	Object.assign(toast.style, {
		position: 'fixed',
		bottom: '2rem',
		left: '50%',
		transform: 'translateX(-50%)',
		background: type === 'error' ? '#e53935' : '#1e88e5',
		color: '#fff',
		padding: '1em 2em',
		borderRadius: '8px',
		boxShadow: '0 2px 8px rgba(30,136,229,0.15)',
		zIndex: 9999,
		fontSize: '1rem',
		opacity: 0.95
	});
	document.body.appendChild(toast);
	setTimeout(() => {
		toast.remove();
	}, 3000);
}

// Reusable function for floating labels on forms
function initializeFloatingLabels() {
	const inputs = document.querySelectorAll('.form-group > input');
	const supportedTypes = ['text', 'email', 'password', 'tel', 'number', 'search', 'url'];

	inputs.forEach(input => {
		// Only apply to supported input types to avoid errors with file/checkbox inputs
		if (!supportedTypes.includes(input.type)) return;

		const label = input.closest('.form-group').querySelector('label');
		if (!label) return;

		const updateLabel = (isFocused) => {
			if (input.value || isFocused) {
				label.style.top = '0';
				label.style.fontSize = '0.8rem';
				label.style.color = 'var(--primary)';
				label.style.fontWeight = '600';
			} else {
				label.style.top = '50%';
				label.style.fontSize = '1rem';
				label.style.color = 'var(--text-lighter, #888)'; // Fallback color
				label.style.fontWeight = 'normal';
			}
		};

		// Initial check
		updateLabel(false);

		input.addEventListener('focus', () => updateLabel(true));
		input.addEventListener('blur', () => updateLabel(false));
	});
}
// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }, 3000); // Wait 3 seconds before asking
}

// Example: Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function(e) {
			const target = document.querySelector(this.getAttribute('href'));
			if (target) {
				e.preventDefault();
				target.scrollIntoView({ behavior: 'smooth' });
			}
		});
	});

	// Initialize floating labels on any page that uses them
	initializeFloatingLabels();

	// Dynamically load translations and language switcher if not already loaded
	try {
		if (!window.appTranslations) {
			// determine base URL of this script
			const script = document.querySelector('script[src$="/assets/main.js"]') || document.currentScript;
			const base = script && script.src ? script.src.replace(/\/[^\/]*$/, '/') : '/docs/assets/';
			
			// Use a function to avoid race conditions with DOMContentLoaded
			const initTranslations = async () => {
				try {
					const mod = await import(base + 'translations.js');
					window.appTranslations = window.appTranslations || mod;
					// Manually trigger translation since DOMContentLoaded might have passed
					mod.translatePage(mod.getLanguage());
					await import(base + 'language-switcher.js');
				} catch (err) {
					console.warn('Could not load translations or language-switcher dynamically:', err);
				}
			};
			initTranslations();
		}
	} catch (e) {
		console.warn('Error while injecting translations dynamically', e);
	}

	// Inject a favicon link into the page head so all pages including this script get the icon.
	try {
		const script = document.querySelector('script[src$="/assets/main.js"]') || document.currentScript;
		const base = script && script.src ? script.src.replace(/\/[^\/]*$/, '/') : './';
		// prefer a PNG icon in the project root assets/images if present, fallback to docs icon
		const pngFallback = base.replace(/docs\/assets\/$/, '') + 'assets/images/icon.png';
		const faviconHref = (async () => {
			try {
				// try to fetch the PNG (fast HEAD) to see if it exists
				const resp = await fetch(pngFallback, { method: 'HEAD' });
				if (resp && resp.ok) return pngFallback;
			} catch (e) {
				// ignore
			}
			return base + 'icons/favicon.svg';
		})();

		(async () => {
			const href = await faviconHref;
			if (!document.querySelector('link[rel="icon"]')) {
				const link = document.createElement('link');
				link.rel = 'icon';
				link.href = href;
				// set type based on extension
				link.type = href.endsWith('.png') ? 'image/png' : 'image/svg+xml';
				document.head.appendChild(link);
			}
		})();
	} catch (e) {
		console.warn('Unable to inject favicon:', e);
	}
});

// Example: Responsive mobile menu toggle (if you have a nav)
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');
if (menuBtn && navMenu) {
	menuBtn.addEventListener('click', () => {
		navMenu.classList.toggle('active');
	});
}

// Save the last visited page before the window unloads
window.addEventListener('beforeunload', () => {
    // List of pages that should not be saved as the last location
    const nonResumablePaths = [
        '/shippers-login/',
        '/trucks-login/',
        '/shippers-register/',
        '/trucks-register/',
        '/index.html',
        '/homepage.html' // Also exclude the root homepage
    ];

    const currentPath = window.location.pathname;

    // Check if the current path includes any of the non-resumable paths
    const isResumable = !nonResumablePaths.some(path => currentPath.includes(path));

    if (isResumable) {
        localStorage.setItem('lastVisitedPage', currentPath);
    }
});
