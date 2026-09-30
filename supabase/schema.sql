-- =====================================================================
-- RAJVEER: Supabase schema. Paste into Supabase > SQL Editor > Run.
-- Safe to run once on a fresh project.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table owners (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create type access_mode as enum ('pin', 'link');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique not null check (username = lower(username) and username !~ '\s'),
  phone text,
  access_mode access_mode not null default 'pin',
  pin_hash text,
  link_token text unique not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_mode = 'link' or pin_hash is not null)
);

create sequence bill_no_seq start 1;

create table bills (
  id uuid primary key default gen_random_uuid(),
  bill_no bigint unique not null default nextval('bill_no_seq'),
  customer_id uuid not null references customers(id) on delete cascade,
  bill_date date not null default current_date,
  item text not null,
  gold_weight numeric(10,3) not null default 0 check (gold_weight >= 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  receipt_date date not null default current_date,
  gold_weight numeric(10,3) not null default 0 check (gold_weight >= 0),
  cash_amount numeric(14,2) not null default 0 check (cash_amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (gold_weight > 0 or cash_amount > 0)
);

create table login_attempts (
  id bigserial primary key,
  identifier text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  business_name text,
  business_phone text,
  business_address text,
  backup_interval_months int not null default 6 check (backup_interval_months in (1, 3, 6)),
  last_backup_at timestamptz,
  backup_snoozed_until timestamptz,
  created_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- Indexes ----------
create index on bills (customer_id, bill_date);
create index on receipts (customer_id, receipt_date);
create index on login_attempts (identifier, created_at);

-- ---------- updated_at triggers ----------
create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_customers_updated before update on customers for each row execute function set_updated_at();
create trigger trg_bills_updated     before update on bills     for each row execute function set_updated_at();
create trigger trg_receipts_updated  before update on receipts  for each row execute function set_updated_at();

-- ---------- Balance view (pending = billed - received) ----------
create view customer_balances with (security_invoker = true) as
select
  c.id as customer_id,
  coalesce(b.total_gold, 0)   as billed_gold,
  coalesce(b.total_amount, 0) as billed_amount,
  coalesce(r.total_gold, 0)   as received_gold,
  coalesce(r.total_cash, 0)   as received_cash,
  coalesce(b.total_gold, 0)   - coalesce(r.total_gold, 0) as pending_gold,
  coalesce(b.total_amount, 0) - coalesce(r.total_cash, 0) as pending_amount,
  coalesce(b.bill_count, 0)   as bill_count
from customers c
left join (
  select customer_id, sum(gold_weight) total_gold, sum(amount) total_amount, count(*) bill_count
  from bills group by customer_id
) b on b.customer_id = c.id
left join (
  select customer_id, sum(gold_weight) total_gold, sum(cash_amount) total_cash
  from receipts group by customer_id
) r on r.customer_id = c.id;

-- ---------- Security: nobody except the server (service role) can touch data ----------
alter table owners         enable row level security;
alter table customers      enable row level security;
alter table bills          enable row level security;
alter table receipts       enable row level security;
alter table login_attempts enable row level security;
alter table settings       enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
