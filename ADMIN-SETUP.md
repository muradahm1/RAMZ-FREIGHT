# Admin Dashboard Setup Guide

## 1. Run SQL Security Setup

Go to your Supabase SQL Editor and run:
```sql
-- File: database/admin-security.sql
```

## 2. Create Your First Admin User

### Option A: Via SQL (Recommended)
1. Sign up at your site with your admin email
2. Run in Supabase SQL Editor:
```sql
UPDATE profiles 
SET user_role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Option B: Via Supabase Dashboard
1. Go to Table Editor > profiles
2. Find your user row
3. Change `user_role` to `admin`

## 3. Access Admin Dashboard

**Local Development:**
- http://localhost:5500/docs/admin-login/admin-login.html

**Production (GitHub Pages):**
- https://muradahm1.github.io/RAMZ-FREIGHT/docs/admin-login/admin-login.html

## 4. Security Features

✅ Role-based access control (admin, management, manager)
✅ Session verification on every page load
✅ RLS policies for data protection
✅ Automatic redirect for unauthorized users
✅ Secure password authentication

## 5. Admin Roles

- **admin**: Full access to all features
- **management**: Access to management dashboard
- **manager**: Access to management dashboard

## 6. Available Features

- Overview Dashboard with stats
- Shipments Management
- Trucks Management
- Drivers/Truck Owners Management
- Shippers Management
- Finance Overview
- Reports
- Settings

## Troubleshooting

**"Access Denied" error:**
- Verify your user_role is set to 'admin', 'management', or 'manager'
- Check profiles table in Supabase

**Can't login:**
- Verify email/password are correct
- Check Supabase Authentication logs

**Data not loading:**
- Run admin-security.sql to enable RLS policies
- Check browser console for errors
