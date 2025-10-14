
// main.js - Global JS for RAMZ-FREIGHT

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
});

// Example: Responsive mobile menu toggle (if you have a nav)
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');
if (menuBtn && navMenu) {
	menuBtn.addEventListener('click', () => {
		navMenu.classList.toggle('active');
	});
}
