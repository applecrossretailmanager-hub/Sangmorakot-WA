-- Optional starter content. Already applied to the linked remote project;
-- kept here so a fresh local/staging database can be seeded the same way.

insert into public.membership_plans (name, description, price_cents, currency, interval, features, sort_order) values
('Casual', 'Pay-as-you-go visits, no lock-in contract.', 2500, 'aud', 'week', '["Access to all group classes","No lock-in contract"]', 1),
('Unlimited Monthly', 'Unlimited Muay Thai classes, month to month.', 15900, 'aud', 'month', '["Unlimited group classes","Free gear storage","Member pricing on merch"]', 2),
('Unlimited Annual', 'Our best value — unlimited classes, billed monthly on a 12 month term.', 12900, 'aud', 'month', '["Unlimited group classes","Locked-in low rate","1 free PT session per month","Free gear storage"]', 3)
on conflict do nothing;

insert into public.pt_packages (name, description, session_count, price_cents, currency, sort_order) values
('Single Session', 'One 1-on-1 personal training session.', 1, 9000, 'aud', 1),
('5 Session Pack', 'Five 1-on-1 personal training sessions.', 5, 42500, 'aud', 2),
('10 Session Pack', 'Ten 1-on-1 personal training sessions — best value.', 10, 80000, 'aud', 3)
on conflict do nothing;

insert into public.pt_trainers (name, bio) values
('Kru Somchai', 'Head coach with 15+ years competing and coaching Muay Thai.')
on conflict do nothing;

with t as (select id from public.pt_trainers where name = 'Kru Somchai' limit 1)
insert into public.pt_availability (trainer_id, day_of_week, start_time, end_time, slot_minutes)
select t.id, d, s, e, 60
from t, (values
  (1, time '06:00', time '08:00'),
  (1, time '17:00', time '19:00'),
  (3, time '06:00', time '08:00'),
  (3, time '17:00', time '19:00'),
  (5, time '06:00', time '08:00'),
  (5, time '17:00', time '19:00'),
  (6, time '09:00', time '12:00')
) as w(d, s, e);
