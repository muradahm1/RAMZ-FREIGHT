# Live Tracking Setup Test Guide

## 1. Database Setup

Run `shipment-tracking-schema.sql` in your Supabase SQL Editor:
- Creates `shipment_tracking` table with proper columns
- Sets up RLS policies for authenticated users
- Enables realtime for the table
- Verifies required tables exist

## 2. Verify Tables

Check these tables exist in Supabase:
- ✅ `shipments` (id, shipper_id, truck_owner_id, vehicle_id, origin_address, destination_address, status, etc.)
- ✅ `truck_owners` (user_id, full_name, phone, etc.)
- ✅ `vehicles` (id, vehicle_model, license_plate, etc.)
- ✅ `shipment_tracking` (id, shipment_id, latitude, longitude, speed, timestamp)

## 3. Test Location Tracking

### From Truck Dashboard:
1. Login as truck owner
2. Accept a shipment (status changes to 'accepted')
3. Click "Start Shipment" button
4. Allow browser location access
5. Check browser console for "Location tracking started"
6. Verify location updates appear in Supabase `shipment_tracking` table

### From Live Tracking Page:
1. Login as shipper
2. Select a shipment with status 'accepted' or 'in_transit'
3. Click "Start Real-Time Tracking"
4. Map should show:
   - Green marker = Pickup location
   - Red marker = Destination
   - Orange truck icon = Current truck position
5. Truck marker should update every 3 seconds
6. Check console for "Realtime tracking update" messages

## 4. Verify Realtime Updates

Open browser console and check for:
```
Realtime tracking update: {latitude: X, longitude: Y, speed: Z, ...}
Location updated: {latitude: X, longitude: Y, speed: Z}
```

## 5. Common Issues

### Location not updating:
- Check browser location permissions
- Verify RLS policies allow insert for truck owner
- Check Supabase logs for errors

### Realtime not working:
- Verify realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE shipment_tracking;`
- Check Supabase dashboard > Database > Replication
- Ensure shipment_tracking table is in replication list

### Map not showing truck:
- Check shipment has tracking data in database
- Verify geocoding is working (check console)
- Ensure shipment status is 'accepted' or 'in_transit'

## 6. Environment Variables

Verify in `supabaseClient.js`:
- `supabaseUrl`: Your Supabase project URL
- `supabaseAnonKey`: Your Supabase anon/public key
- Both should match your Supabase project settings

## 7. Test Credentials

If you see authentication errors:
1. Go to Supabase Dashboard > Settings > API
2. Copy Project URL and anon public key
3. Update `supabaseClient.js` with correct values
4. Redeploy frontend

## 8. Manual Test Query

Run in Supabase SQL Editor to check tracking data:
```sql
SELECT 
    st.*,
    s.origin_address,
    s.destination_address,
    s.status
FROM shipment_tracking st
JOIN shipments s ON s.id = st.shipment_id
ORDER BY st.timestamp DESC
LIMIT 10;
```
