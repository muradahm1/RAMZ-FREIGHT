import { setLanguage, getLanguage } from './translations.js';

export function createLanguageSwitcher() {
    const currentLang = getLanguage();
    const langNames = { en: 'EN', am: 'አማ', om: 'OM' };
    
    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
        <button class="lang-dropdown-btn">
            <span class="current-lang">${langNames[currentLang]}</span>
            <i class="fas fa-chevron-down"></i>
        </button>
        <div class="lang-dropdown-menu">
            <div class="lang-option" data-lang="en">🇬🇧 English</div>
            <div class="lang-option" data-lang="am">🇪🇹 አማርኛ</div>
            <div class="lang-option" data-lang="om">🇪🇹 Afaan Oromoo</div>
        </div>
    `;
    
    const dropdownBtn = switcher.querySelector('.lang-dropdown-btn');
    const dropdownMenu = switcher.querySelector('.lang-dropdown-menu');
    const currentLangSpan = switcher.querySelector('.current-lang');
    
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    switcher.querySelectorAll('.lang-option').forEach(option => {
        if (option.dataset.lang === currentLang) {
            option.classList.add('active');
        }
        
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = option.dataset.lang;
            setLanguage(lang);
            currentLangSpan.textContent = langNames[lang];
            switcher.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            dropdownMenu.classList.remove('show');
        });
    });
    
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });
    
    return switcher;
}

// Auto-add to header - use immediate execution to prevent duplicates
if (!window.languageSwitcherInitialized) {
    window.languageSwitcherInitialized = true;
    
    document.addEventListener('DOMContentLoaded', () => {
        const langContainer = document.getElementById('langSwitcher');
        if (langContainer && !langContainer.hasChildNodes()) {
            langContainer.appendChild(createLanguageSwitcher());
        }
    });
}
