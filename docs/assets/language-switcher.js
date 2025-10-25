import { setLanguage, getLanguage } from './translations.js';

export function createLanguageSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="am">አማ</button>
        <button class="lang-btn" data-lang="om">OM</button>
    `;
    
    const currentLang = getLanguage();
    switcher.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        }
        
        // Add both click and touchend for mobile support
        const handleLanguageChange = (e) => {
            e.preventDefault();
            const lang = btn.dataset.lang;
            setLanguage(lang);
            
            switcher.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        
        btn.addEventListener('click', handleLanguageChange);
        btn.addEventListener('touchend', handleLanguageChange);
    });
    
    return switcher;
}

// Auto-add to header
document.addEventListener('DOMContentLoaded', () => {
    const langContainer = document.getElementById('langSwitcher');
    if (langContainer) {
        langContainer.appendChild(createLanguageSwitcher());
    } else {
        const headerActions = document.querySelector('.header-actions') || document.querySelector('.header-right');
        if (headerActions) {
            headerActions.insertBefore(createLanguageSwitcher(), headerActions.firstChild);
        }
    }
});
