CREATE POLICY "Confirmers can read confirmation settings"
ON public.confirmation_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'confirmer'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));