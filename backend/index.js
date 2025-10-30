
// Basic Express server setup
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 4000;

// SECURITY: Never hardcode credentials - use environment variables only
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('FATAL: Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Client for general operations (respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client for operations that need to bypass RLS (uses service role key)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CORS middleware - restrict to your frontend domain in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://muradahm1.github.io'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
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
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      payment_amount: payload.payment_amount || null,
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

    // Determine role
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

    const statusFilter = req.query.status;
    
    // Use admin client to bypass RLS for truck owners
    const client = (role === 'truck_owner' || role === 'truck') ? supabaseAdmin : supabase;

    let query = client.from('shipments').select('*').order('created_at', { ascending: false });

    if (role === 'shipper' || role === 'shipper_user') {
      query = query.eq('shipper_id', user.id);
    } else if (role === 'truck_owner' || role === 'truck') {
      // Truck owners see: their assigned shipments OR pending shipments that are unassigned
      query = query.or(`truck_owner_id.eq.${user.id},and(status.eq.pending,truck_owner_id.is.null)`);
    } else if (role === 'manager' || role === 'admin' || role === 'management') {
      // Managers see all
    } else {
      return res.status(403).json({ error: 'Insufficient permissions to view shipments' });
    }

    if (statusFilter) {
      query = query.filter('status', 'eq', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Query error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`User ${user.id} (${role}) fetched ${data?.length || 0} shipments`);
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

    // Use admin client to bypass RLS for this operation
    const client = supabaseAdmin;

    // Load the shipment
    const { data: existing, error: fetchErr } = await client.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: `Shipment is not available for assignment (current status: ${existing.status})` });
    if (existing.truck_owner_id) return res.status(400).json({ error: 'Shipment is already assigned to another truck owner' });

    // Assign to self using admin client
    console.log(`Assigning shipment ${shipmentId} to user ${user.id}`);
    const { data, error } = await client.from('shipments').update({ truck_owner_id: user.id, status: 'accepted' }).eq('id', shipmentId).select().maybeSingle();
    if (error) {
      console.error('Error updating shipment:', error);
      return res.status(500).json({ error: error.message });
    }
    console.log('Shipment assigned successfully:', data);

    // Create notification for shipper
    if (data && data.shipper_id) {
      await client.from('notifications').insert({
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

// Deliver a shipment (truck owner marks as delivered)
app.post('/shipments/:id/deliver', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    // Use admin client to bypass RLS
    const client = supabaseAdmin;

    const { data: existing, error: fetchErr } = await client.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.truck_owner_id !== user.id) return res.status(403).json({ error: 'You are not assigned to this shipment' });

    const { data, error } = await client.from('shipments').update({ status: 'delivered' }).eq('id', shipmentId).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // Create notification for shipper
    if (data && data.shipper_id) {
      await client.from('notifications').insert({
        user_id: data.shipper_id,
        title: 'Shipment Delivered',
        message: `Your shipment to ${data.destination_address} has been delivered successfully.`,
        type: 'success',
        shipment_id: data.id
      });
    }

    res.json({ shipment: data });
  } catch (err) {
    console.error('Error in POST /shipments/:id/deliver:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ADMIN-ONLY: Get full shipment details for any shipment
app.get('/admin/shipments/:id', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    // Verify user is an admin
    const { data: profile } = await supabaseAdmin.from('profiles').select('user_role').eq('id', user.id).single();
    const allowedRoles = ['admin', 'management', 'manager'];
    if (!profile || !allowedRoles.includes(profile.user_role)) {
      return res.status(403).json({ error: 'Access Denied: You do not have permission to perform this action.' });
    }

    // Fetch shipment
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (shipmentError) {
      console.error('Admin shipment fetch error:', shipmentError);
      return res.status(500).json({ error: shipmentError.message });
    }
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found.' });
    }

    // Fetch shipper details
    let shipperDetails = null;
    if (shipment.shipper_id) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(shipment.shipper_id);
      if (authData?.user) {
        shipperDetails = {
          full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'N/A',
          email: authData.user.email || 'N/A',
          phone: authData.user.user_metadata?.phone || 'N/A'
        };
      }
    }

    // Fetch truck owner details
    let truckOwnerDetails = null;
    if (shipment.truck_owner_id) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(shipment.truck_owner_id);
      if (authData?.user) {
        truckOwnerDetails = {
          full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'N/A',
          email: authData.user.email || 'N/A',
          phone: authData.user.user_metadata?.phone || 'N/A'
        };
      }
    }

    // Fetch vehicle details
    let vehicleDetails = null;
    if (shipment.vehicle_id) {
      const { data: vehicle } = await supabaseAdmin.from('vehicles').select('vehicle_model, license_plate').eq('id', shipment.vehicle_id).single();
      vehicleDetails = vehicle;
    }

    res.json({ shipment: { ...shipment, shipper: shipperDetails, truck_owner: truckOwnerDetails, vehicle: vehicleDetails } });
  } catch (err) {
    console.error('Error in /admin/shipments/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get full shipment details for tracking page (securely)
app.get('/shipment-details/:id', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const verification = await getUserFromBearer(req);
    if (verification.error) return res.status(401).json({ error: verification.error });
    const user = verification.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid user' });

    // Use admin client to fetch related data, but first verify user has access to the shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, shipper_id, truck_owner_id, vehicle_id, origin_address, destination_address, goods_description, status')
      .eq('id', shipmentId)
      .eq('shipper_id', user.id) // RLS check: user must be the shipper
      .single();

    if (shipmentError) return res.status(500).json({ error: shipmentError.message });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found or you do not have permission to view it.' });

    let truckOwnerDetails = null;
    let vehicleDetails = null;

    // Securely fetch truck owner details using admin client
    if (shipment.truck_owner_id) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(shipment.truck_owner_id);
      if (!authError && authData.user) {
        truckOwnerDetails = {
          full_name: authData.user.user_metadata?.full_name || authData.user.email.split('@')[0],
          phone: authData.user.user_metadata?.phone || 'N/A',
          avatar_url: authData.user.user_metadata?.avatar_url
        };
      }
    }

    // Fetch vehicle details
    if (shipment.vehicle_id) {
      const { data: vehicle } = await supabaseAdmin.from('vehicles').select('vehicle_model, license_plate').eq('id', shipment.vehicle_id).single();
      vehicleDetails = vehicle;
    }

    res.json({ shipment, truckOwnerDetails, vehicleDetails });
  } catch (err) {
    console.error('Error in /shipment-details/:id:', err);
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
