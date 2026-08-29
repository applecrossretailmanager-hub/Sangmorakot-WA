-- Prevent double-logging a payment if Stripe retries a webhook delivery.
create unique index payments_stripe_event_id_idx
  on public.payments (stripe_event_id)
  where stripe_event_id is not null;
