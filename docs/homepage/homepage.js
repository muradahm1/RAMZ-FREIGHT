import { isUserLoggedIn } from '../assets/auth.js'
import { createLanguageSwitcher } from '../assets/language-switcher.js'
import { setLanguage, getLanguage } from '../assets/translations.js'

// Initialize language switcher
document.addEventListener('DOMContentLoaded', () => {
  const langContainer = document.getElementById('langSwitcher');
  if (langContainer) {
    langContainer.appendChild(createLanguageSwitcher());
  }
});

// Immediately check for a previous session and redirect if applicable
(function() {
    const lastVisitedPage = localStorage.getItem('lastVisitedPage');
    // Ensure the path is not the homepage to prevent a redirect loop
    const isResumable = lastVisitedPage && !lastVisitedPage.includes('homepage.html');

    if (isResumable && isUserLoggedIn()) {
        // Use replace to avoid polluting browser history
        window.location.replace(lastVisitedPage);
    }
})();

// Contact Form Submission
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');
    
    // Simple validation
    if (!name || !email || !subject || !message) {
      alert('Please fill in all fields');
      return;
    }
    
    // In a real application, you would send this data to a server
    // For now, we'll just show a success message
    alert('Thank you for your message! We will get back to you soon.');
    this.reset();
  });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80; // Account for fixed header
      
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// Add scroll effect to navbar
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 100) {
    navbar.style.backgroundColor = 'rgba(18, 18, 18, 0.98)';
    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
  } else {
    navbar.style.backgroundColor = 'rgba(18, 18, 18, 0.95)';
    navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
  }
});

// Animation on scroll
function animateOnScroll() {
  const elements = document.querySelectorAll('.reason, .about-content, .contact-content');
  
  elements.forEach(element => {
    const elementTop = element.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    
    if (elementTop < windowHeight - 100) {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }
  });
}

// Set initial state for animated elements
document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.reason, .about-content, .contact-content');
  
  elements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.5s, transform 0.5s';
  });
  
  // Trigger animation on load
  setTimeout(animateOnScroll, 300);
  
  // Add scroll event listener for animations
  window.addEventListener('scroll', animateOnScroll);
});