export const translations = {
    en: {
        // Common
        home: "Home",
        dashboard: "Dashboard",
        logout: "Logout",
        back: "Back",
        submit: "Submit",
        cancel: "Cancel",
        save: "Save",
        
        // Navigation
        createShipment: "Create Shipment",
        trackShipment: "Track Shipment",
        history: "History",
        settings: "Settings",
        
        // Shipment
        origin: "Origin Address",
        destination: "Destination Address",
        goodsDescription: "Description of Goods",
        weight: "Total Weight (kg)",
        goodsType: "Type of Goods",
        pickupDate: "Pickup Date",
        pickupTime: "Pickup Time",
        paymentAmount: "Payment Amount ($)",
        specialInstructions: "Special Instructions",
        
        // Status
        pending: "Pending",
        accepted: "Accepted",
        pickedUp: "Picked Up",
        inTransit: "In Transit",
        delivered: "Delivered",
        
        // Tracking
        currentSpeed: "Current Speed",
        distanceTraveled: "Distance Traveled",
        estimatedArrival: "Estimated Arrival",
        driverName: "Driver Name",
        vehicleInfo: "Vehicle Info"
    },
    
    am: {
        // Common - Amharic
        home: "መነሻ",
        dashboard: "ዳሽቦርድ",
        logout: "ውጣ",
        back: "ተመለስ",
        submit: "አስገባ",
        cancel: "ሰርዝ",
        save: "አስቀምጥ",
        
        // Navigation
        createShipment: "ጭነት ፍጠር",
        trackShipment: "ጭነት ተከታተል",
        history: "ታሪክ",
        settings: "ቅንብሮች",
        
        // Shipment
        origin: "የመነሻ አድራሻ",
        destination: "የመድረሻ አድራሻ",
        goodsDescription: "የዕቃ መግለጫ",
        weight: "ጠቅላላ ክብደት (ኪግ)",
        goodsType: "የዕቃ አይነት",
        pickupDate: "የመውሰጃ ቀን",
        pickupTime: "የመውሰጃ ሰዓት",
        paymentAmount: "የክፍያ መጠን ($)",
        specialInstructions: "ልዩ መመሪያዎች",
        
        // Status
        pending: "በመጠባበቅ ላይ",
        accepted: "ተቀባይነት አግኝቷል",
        pickedUp: "ተወስዷል",
        inTransit: "በመንገድ ላይ",
        delivered: "ደርሷል",
        
        // Tracking
        currentSpeed: "የአሁን ፍጥነት",
        distanceTraveled: "የተጓዘ ርቀት",
        estimatedArrival: "የሚደርስበት ግምት",
        driverName: "የአሽከርካሪ ስም",
        vehicleInfo: "የተሽከርካሪ መረጃ"
    },
    
    om: {
        // Common - Oromo
        home: "Mana",
        dashboard: "Gabatee",
        logout: "Ba'i",
        back: "Deebi'i",
        submit: "Galchi",
        cancel: "Haqi",
        save: "Olkaa'i",
        
        // Navigation
        createShipment: "Fe'iinsa Uumi",
        trackShipment: "Fe'iinsa Hordofi",
        history: "Seenaa",
        settings: "Qindaa'ina",
        
        // Shipment
        origin: "Teessoo Jalqabaa",
        destination: "Teessoo Xumuraa",
        goodsDescription: "Ibsa Meeshaa",
        weight: "Ulfaatina Waliigalaa (kg)",
        goodsType: "Gosa Meeshaa",
        pickupDate: "Guyyaa Fudhachuu",
        pickupTime: "Sa'aatii Fudhachuu",
        paymentAmount: "Hanga Kaffaltii ($)",
        specialInstructions: "Qajeelfama Addaa",
        
        // Status
        pending: "Eegaa jira",
        accepted: "Fudhatame",
        pickedUp: "Fudhatame",
        inTransit: "Karaa irra",
        delivered: "Geeffame",
        
        // Tracking
        currentSpeed: "Saffisa Ammaa",
        distanceTraveled: "Fageenya Deemame",
        estimatedArrival: "Tilmaama Ga'iinsa",
        driverName: "Maqaa Konkolaachisaa",
        vehicleInfo: "Odeeffannoo Konkolaataa"
    }
};

export function setLanguage(lang) {
    localStorage.setItem('appLanguage', lang);
    translatePage(lang);
}

export function getLanguage() {
    return localStorage.getItem('appLanguage') || 'en';
}

export function translatePage(lang) {
    const t = translations[lang] || translations.en;
    
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
}

// Auto-translate on page load
document.addEventListener('DOMContentLoaded', () => {
    translatePage(getLanguage());
});
