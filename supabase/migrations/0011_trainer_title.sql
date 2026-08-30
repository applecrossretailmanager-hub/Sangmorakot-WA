-- Separate "role" line (e.g. "Head Coach | Muay Thai") from the bio body,
-- so it can be styled as its own subtitle instead of living inside the bio
-- paragraph text.
alter table public.pt_trainers add column title text;
