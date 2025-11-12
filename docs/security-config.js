// Security Configuration
export const securityConfig = {
    // Content Security Policy
    csp: {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
        'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com",
        'img-src': "'self' data: https: blob:",
        'connect-src': "'self' https: wss:",
        'font-src': "'self' https://cdnjs.cloudflare.com",
        'frame-src': "'none'",
        'object-src': "'none'",
        'base-uri': "'self'"
    },
    
    // Rate limiting
    rateLimits: {
        login: { requests: 5, window: 900000 }, // 5 requests per 15 minutes
        register: { requests: 3, window: 3600000 }, // 3 requests per hour
        api: { requests: 100, window: 60000 } // 100 requests per minute
    },
    
    // Input validation
    validation: {
        maxStringLength: 1000,
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        maxFileSize: 5 * 1024 * 1024 // 5MB
    }
};

// Apply CSP headers
export function applySecurityHeaders() {
    if (typeof document !== 'undefined') {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = Object.entries(securityConfig.csp)
            .map(([key, value]) => `${key} ${value}`)
            .join('; ');
        document.head.appendChild(meta);
    }
}

// Input sanitization
export function sanitizeInput(input, maxLength = securityConfig.validation.maxStringLength) {
    if (typeof input !== 'string') return '';
    return input.slice(0, maxLength).replace(/[<>\"'&]/g, (match) => {
        const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        };
        return entities[match];
    });
}

// Rate limiting check
export function checkRateLimit(action, userId = 'anonymous') {
    const key = `${action}_${userId}`;
    const now = Date.now();
    const limit = securityConfig.rateLimits[action];
    
    if (!limit) return true;
    
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const validAttempts = attempts.filter(time => now - time < limit.window);
    
    if (validAttempts.length >= limit.requests) {
        return false;
    }
    
    validAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(validAttempts));
    return true;
}