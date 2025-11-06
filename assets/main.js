
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
});

// Example: Responsive mobile menu toggle (if you have a nav)
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');
if (menuBtn && navMenu) {
	menuBtn.addEventListener('click', () => {
		navMenu.classList.toggle('active');
	});
}
