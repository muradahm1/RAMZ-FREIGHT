// JWT-based authentication check
export function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        redirectToLogin();
        return null;
    }
    
    try {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
            console.log('Token expired');
            logout();
            return null;
        }
        
        return {
            token,
            user: JSON.parse(user)
        };
    } catch (error) {
        console.error('Error parsing auth data:', error);
        logout();
        return null;
    }
}

export function isUserLoggedIn() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp >= currentTime;
    } catch (error) {
        return false;
    }
}

export function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastVisitedPage'); // Clear last visited page on logout
    redirectToLogin();
}

export function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

function redirectToLogin() {
    window.location.href = '../shippers-login/shippers-login.html';
}