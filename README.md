# RAMZ-FREIGHT

A freight management platform connecting shippers and truck owners across Ethiopia.

## Features
- User registration and authentication for shippers and truck owners
- Profile completion with document upload
- Secure JWT authentication
- Rate limiting and security middleware
- Supabase database integration
- Real-time shipment tracking
- Bidding system for carriers
- PWA support for offline functionality

## 🚀 Quick Start

### Backend Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Copy `docs/assets/config.example.js` to `docs/assets/config.js`
2. Update config.js with your Supabase credentials
3. Open `docs/index.html` in a browser or deploy to hosting

## Environment Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 4000)

## Database Setup
Run all SQL scripts in the `database/` folder in your Supabase SQL Editor.

## 📋 Before Launch

**CRITICAL**: See `LAUNCH-CHECKLIST.md` for complete pre-launch tasks.

Key items:
1. Remove hardcoded credentials from `docs/assets/supabaseClient.js`
2. Set up secure config files
3. Deploy backend to Render/Railway
4. Deploy frontend to GitHub Pages/Netlify/Vercel
5. Run all database migrations
6. Test all user flows

See `DEPLOYMENT.md` for detailed deployment instructions.

## License
MIT