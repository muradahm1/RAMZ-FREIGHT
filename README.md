# RAMZ-FREIGHT

A freight management platform connecting shippers and truck owners across Ethiopia.

## Features
- User registration and authentication for shippers and truck owners
- Profile completion with document upload
- Secure JWT authentication
- Rate limiting and security middleware
- Supabase database integration

## Setup

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

## Environment Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 4000)

## Database Setup
Run the SQL in `database-schema.sql` in your Supabase SQL Editor.

## License
MIT