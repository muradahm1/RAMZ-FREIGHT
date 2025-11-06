# 🚛 RAMZ-FREIGHT

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://muradahm1.github.io/RAMZ-FREIGHT/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black)](https://github.com/muradahm1/RAMZ-FREIGHT)

**RAMZ-FREIGHT** is a modern freight management platform designed to connect shippers and truck owners across Ethiopia. The application is built as a Progressive Web App (PWA) using vanilla JavaScript, HTML, and CSS, with Supabase serving as the primary backend for authentication, database, and storage.

## ✨ Features

- **🔐 Dual User Roles:** Separate registration, login, and dashboard flows for Shippers and Truck Owners
- **🌍 Multi-language Support:** Fully translated interface for English, Amharic (አማርኛ), and Oromo (Afaan Oromoo)
- **🔒 Secure Authentication:** Email/password and Google OAuth sign-in powered by Supabase Auth
- **📋 Profile Management:** Multi-step profile completion for truck owners with document uploads
- **📦 Shipment Management:** Shippers can create loads, truck owners can view and accept them
- **🔄 Real-time Updates:** Live dashboard updates for available loads and accepted shipments
- **📱 PWA Enabled:** Offline capabilities and app-like installation on mobile devices
- **🗺️ Live Tracking:** Real-time GPS tracking for shipments in transit
- **💬 Notifications:** In-app notification system for shipment updates

## 🚀 Quick Start

This project is a client-side application that connects directly to Supabase.

### Prerequisites
- A modern web browser
- A local web server (e.g., VS Code Live Server)
- Supabase account (for backend services)

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/muradahm1/RAMZ-FREIGHT.git
   cd RAMZ-FREIGHT
   ```

2. **Configure Supabase:**
   - Navigate to `docs/assets/supabaseClient.js`
   - Update with your Supabase Project URL and Anon Key:
   ```javascript
   const SUPABASE_URL = 'your-project-url'
   const SUPABASE_ANON_KEY = 'your-anon-key'
   ```

3. **Run Locally:**
   - Use VS Code's "Live Server" extension or any static file server
   - Serve the `docs` directory
   - Open `docs/homepage/homepage.html` in your browser

## 🛠️ Technology Stack

### Frontend
- **Languages:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
- **Architecture:** Progressive Web App (PWA)
- **Styling:** Custom CSS with responsive design

### Backend
- **BaaS:** Supabase
  - Authentication (Email/Password, Google OAuth)
  - PostgreSQL Database
  - Storage (Document uploads)
  - Real-time subscriptions

### Deployment
- **Hosting:** GitHub Pages (or Netlify, Vercel)
- **CI/CD:** GitHub Actions ready

## 📁 Project Structure

```
RAMZ-FREIGHT/
├── docs/                          # Main application directory
│   ├── assets/                    # Shared assets
│   │   ├── translations.js        # Multi-language support
│   │   ├── supabaseClient.js      # Supabase configuration
│   │   └── main.css               # Global styles
│   ├── homepage/                  # Landing page
│   ├── shippers-register/         # Shipper registration
│   ├── shippers-login/            # Shipper login
│   ├── shippers-dashboard/        # Shipper dashboard
│   ├── trucks-register/           # Truck owner registration
│   ├── trucks-login/              # Truck owner login
│   ├── trucks-dashboard-cheak/    # Truck owner dashboard
│   ├── create-shipment/           # Shipment creation
│   └── live-tracking/             # Real-time tracking
├── database/                      # SQL scripts for Supabase
├── backend/                       # Optional backend server
└── README.md
```

## 🗄️ Database Setup

1. Create a new Supabase project
2. Navigate to the SQL Editor in your Supabase dashboard
3. Run the scripts from the `database/` folder in order:
   - `supabase-setup.sql` - Main tables and schema
   - `admin-security.sql` - Security policies
   - `create-ratings-table.sql` - Rating system

## 🌐 Deployment

### GitHub Pages (Recommended)

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select branch `main` and folder `/docs`
4. Your site will be live at `https://yourusername.github.io/RAMZ-FREIGHT/`

### Environment Variables

Before deploying, ensure you update:
- Supabase credentials in `docs/assets/supabaseClient.js`
- OAuth redirect URLs in Google Cloud Console
- Supabase Auth settings for your production domain

## 🔧 Configuration

### OAuth Setup

1. **Google OAuth:**
   - Create a project in Google Cloud Console
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://yourdomain.com/docs/auth/callback.html`
     - Your Supabase project callback URL

2. **Supabase:**
   - Add OAuth provider in Authentication → Providers
   - Configure redirect URLs
   - Enable email confirmations if needed

## 🧪 Testing

### User Flows to Test:

- ✅ Shipper registration and login
- ✅ Truck owner registration and profile completion
- ✅ Shipment creation and listing
- ✅ Load acceptance by truck owners
- ✅ Real-time tracking
- ✅ Language switching (EN/AM/OM)
- ✅ Google OAuth authentication

## 🌍 Multi-language Support

The platform supports three languages:
- **English (EN)** - Default
- **Amharic (አማርኛ)** - Ethiopian language
- **Oromo (Afaan Oromoo)** - Ethiopian language

Language preference is stored in localStorage and persists across sessions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Murad Ahmed** - [GitHub](https://github.com/muradahm1)

## 🙏 Acknowledgments

- Supabase for the amazing backend platform
- Ethiopian logistics community for inspiration
- All contributors and testers

## 📞 Support

For support, email info@ramzfreight.com or open an issue in the GitHub repository.

---

**Made with ❤️ in Ethiopia**