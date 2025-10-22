
// Basic Express server setup
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 4000;

// Replace with your actual Supabase URL and Key
const SUPABASE_URL = 'https://sgmcuwmqmgchvnncbarb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbWN1d21xbWdjaHZubmNiYXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk5ODYsImV4cCI6MjA3NDk2NTk4Nn0.zytOCIukl2NJCq2ZSXeCo_XCOpSxH6bqV3wk9iLXqM0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// User registration endpoint (signup)
app.post('/auth/signup', async (req, res) => {
  const { email, password, fullName, phone, companyName, businessType, userType } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          user_role: userType === 'shipper' ? 'shipper' : 'truck_owner'
        }
      }
    });
    if (error) return res.status(400).json({ error: error.message });
    
    // Create profile in appropriate table
    if (data.user && userType === 'shipper') {
      await supabase.from('shippers').insert({
        user_id: data.user.id,
        full_name: fullName,
        phone: phone,
        company_name: companyName,
        business_type: businessType
      });
    } else if (data.user && userType === 'truck') {
      await supabase.from('truck_owners').insert({
        user_id: data.user.id,
        full_name: fullName,
        phone: phone
      });
    }
    
    res.json({ user: data.user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send('RAMZ-FREIGHT Backend is running!');
});

// Helper: verify access token sent from client and return user
async function getUserFromBearer(req) {
  const auth = req.headers['authorization'] || '';
  const match = auth.match(/^Bearer\s+(.*)$/i);
  if (!match) return { error: 'Missing Authorization header' };
  const token = match[1];

  // Verify session via Supabase auth API
  try {
    // Using the REST admin endpoint would require service role key. Instead
    // attempt to use the SDK to get user from token via auth.getUser
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return { error: error.message };
    return { user: data.user };
  } catch (err) {
    return { error: err.message || 'Failed to verify token' };
  }
}

// Create shipment endpoint
app.post('/shipments', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    if (!match) return res.status(401).json({ error: 'Missing Authorization header' });
    const token = match[1];

    // Create Supabase client with user's token for RLS
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    const payload = req.body || {};
    if (!payload.origin_address || !payload.destination_address || !payload.pickup_datetime) {
      return res.status(400).json({ error: 'Missing required fields: origin_address, destination_address, pickup_datetime' });
    }

    const insert = {
      shipper_id: user.id,
      origin_address: payload.origin_address,
      destination_address: payload.destination_address,
      goods_description: payload.goods_description || null,
      weight_kg: payload.weight_kg || null,
      goods_type: payload.goods_type || null,
      pickup_datetime: payload.pickup_datetime ? new Date(payload.pickup_datetime).toISOString() : null,
      special_instructions: payload.special_instructions || null,
      status: 'pending'
    };

    const { data, error } = await userSupabase.from('shipments').insert([insert]).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ shipment: data });
  } catch (err) {
    console.error('Error in /shipments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List shipments - role-aware
// - shippers: see their own shipments
// - truck_owner: see shipments assigned to them and unassigned (pending)
// - manager/admin: see all shipments
app.get('/shipments', async (req, res) => {
  try {
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    // Determine role: first check user.user_metadata, then profiles table
    let role = user?.user_metadata?.user_role || null;
    if (!role) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile && profile.user_role) role = profile.user_role;
      if (profileError) console.warn('profiles lookup error:', profileError.message || profileError);
    }

    const statusFilter = req.query.status; // optional ?status=pending

    let query = supabase.from('shipments').select('*').order('created_at', { ascending: false });

    if (role === 'shipper' || role === 'shipper_user') {
      query = query.eq('shipper_id', user.id);
    } else if (role === 'truck_owner' || role === 'truck') {
      // truck owners should see shipments assigned to them and pending/unassigned shipments
      // We'll fetch shipments where truck_owner_id == user.id OR status == 'pending'
      // Supabase JS doesn't allow OR easily without rpc; use filter via or()
      // Example: .or(`truck_owner_id.eq.${user.id},status.eq.pending`)
      query = supabase.from('shipments').select('*').or(`truck_owner_id.eq.${user.id},status.eq.pending`).order('created_at', { ascending: false });
    } else if (role === 'manager' || role === 'admin' || role === 'management') {
      // no additional filters; managers see all
    } else {
      // default to no access
      return res.status(403).json({ error: 'Insufficient permissions to view shipments' });
    }

    if (statusFilter) {
      // apply status filter on top (note: for truck_owner case, re-run a refined query)
      query = query.filter('status', 'eq', statusFilter);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ shipments: data });
  } catch (err) {
    console.error('Error in GET /shipments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign a shipment to the authenticated truck owner (self-assign)
app.post('/shipments/:id/assign', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    // Load the shipment
    const { data: existing, error: fetchErr } = await supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: 'Shipment is not available for assignment' });

    // Assign to self
    const { data, error } = await supabase.from('shipments').update({ truck_owner_id: user.id, status: 'accepted' }).eq('id', shipmentId).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // Create notification for shipper
    if (data && data.shipper_id) {
      await supabase.from('notifications').insert({
        user_id: data.shipper_id,
        title: 'Shipment Accepted',
        message: `Your shipment from ${data.origin_address} to ${data.destination_address} has been accepted by a truck owner.`,
        type: 'success',
        shipment_id: data.id
      });
    }

    res.json({ shipment: data });
  } catch (err) {
    console.error('Error in POST /shipments/:id/assign:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a shipment (truck owner marks as in_transit)
app.post('/shipments/:id/start', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    const { data: existing, error: fetchErr } = await supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.truck_owner_id !== user.id) return res.status(403).json({ error: 'You are not assigned to this shipment' });

    const { data, error } = await supabase.from('shipments').update({ status: 'in_transit' }).eq('id', shipmentId).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ shipment: data });
  } catch (err) {
    console.error('Error in POST /shipments/:id/start:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User authentication endpoint (login)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Example: Get all users from Supabase auth (requires service role key for real use)
// app.get('/users', async (req, res) => {
//   const { data, error } = await supabase.auth.admin.listUsers();
//   if (error) return res.status(500).json({ error: error.message });
//   res.json(data);
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
