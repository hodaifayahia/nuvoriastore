-- Allow anyone to read active delivery companies
CREATE POLICY "Anyone can read active delivery companies"
  ON public.delivery_companies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
