// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('../../sw.js');
      console.log('SW registered: ', registration);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, show update notification
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  });
}

// Install prompt with impressive banner
let deferredPrompt;
let bannerShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show banner after 3 seconds if not already shown
  if (!bannerShown && !localStorage.getItem('pwa-banner-dismissed')) {
    setTimeout(showInstallBanner, 3000);
  }
});

function showInstallBanner() {
  const banner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const closeBtn = document.getElementById('closeBanner');
  
  if (banner && deferredPrompt) {
    bannerShown = true;
    banner.classList.add('show');
    
    // Install button click
    installBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        hideInstallBanner();
        deferredPrompt = null;
      });
    });
    
    // Close button click
    closeBtn.addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('pwa-banner-dismissed', 'true');
    });
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) {
    banner.classList.add('hide');
    setTimeout(() => {
      banner.style.display = 'none';
      banner.classList.remove('show', 'hide');
    }, 400);
  }
}

// Show banner on scroll if not dismissed
let scrollTriggered = false;
window.addEventListener('scroll', () => {
  if (!scrollTriggered && !bannerShown && !localStorage.getItem('pwa-banner-dismissed') && window.scrollY > 500) {
    scrollTriggered = true;
    if (deferredPrompt) {
      showInstallBanner();
    }
  }
});