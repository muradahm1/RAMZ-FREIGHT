// PWA Install Prompt Handler
let deferredPrompt;
let installBtnShown = false;

// Show install button immediately on page load
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for page to load, then show install button
  setTimeout(() => {
    if (!installBtnShown) {
      showInstallButton();
    }
  }, 2000); // Show after 2 seconds
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!installBtnShown) {
    showInstallButton();
  }
});

function showInstallButton() {
  if (installBtnShown) return;
  installBtnShown = true;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
  installBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.5s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      
      deferredPrompt = null;
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      alert('To install this app:\n\n1. Click the menu button (⋮) in your browser\n2. Select "Install app" or "Add to Home Screen"');
    }
    
    installBtn.remove();
    installBtnShown = false;
  });
  
  document.body.appendChild(installBtn);
}

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.remove();
  }
  installBtnShown = false;
});
