-- Expose payment-method display settings to the storefront so anon shoppers
-- can see enabled payment options and the account details they need to pay.
UPDATE public.settings
SET is_public = true
WHERE key IN (
  'cod_enabled','cash_on_delivery_enabled',
  'baridimob_enabled','ccp_number','ccp_name',
  'flexy_enabled','flexy_number','flexy_deposit_amount',
  'binance_enabled','binance_wallet','binance_address',
  'vodafone_enabled','vodafone_number',
  'redotpay_enabled','redotpay_account','redotpay_address'
);