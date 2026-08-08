-- order_items: tie insert to order ownership/recency
DROP POLICY IF EXISTS "Anyone can insert order items for an existing order" ON public.order_items;
CREATE POLICY "Order items only for own or just-created orders"
ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND quantity > 0
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR (
          o.created_at > now() - interval '15 minutes'
          AND (o.client_ip IS NULL OR o.client_ip = public.current_client_ip())
        )
      )
  )
);

-- return_requests: phone must match the order's phone
DROP POLICY IF EXISTS "Anyone can insert return_requests" ON public.return_requests;
CREATE POLICY "Return requests require matching order phone"
ON public.return_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  customer_phone IS NOT NULL
  AND length(trim(both from customer_phone)) >= 8
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = return_requests.order_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR regexp_replace(o.customer_phone, '\D', '', 'g')
           = regexp_replace(return_requests.customer_phone, '\D', '', 'g')
      )
  )
);

-- return_photos: only on own or just-created return requests
DROP POLICY IF EXISTS "Anyone can insert return_photos" ON public.return_photos;
CREATE POLICY "Return photos only for own or just-created requests"
ON public.return_photos FOR INSERT TO anon, authenticated
WITH CHECK (
  return_request_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.return_requests r
    JOIN public.orders o ON o.id = r.order_id
    WHERE r.id = return_photos.return_request_id
      AND (
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
        OR r.created_at > now() - interval '30 minutes'
      )
  )
);