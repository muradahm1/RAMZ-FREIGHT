-- Add payment_amount column to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2);

-- Add comment
COMMENT ON COLUMN shipments.payment_amount IS 'Amount shipper is willing to pay for the shipment';
