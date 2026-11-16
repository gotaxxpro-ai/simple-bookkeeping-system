-- Run this entire script in your Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- 1. Business Profile (per user)
create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text default '',
  business_activity text default '',
  naics_code text default '',
  updated_at timestamptz default now()
);

-- 2. Income & Expenses Transactions
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  tx_date date not null,
  category text not null,
  description text default '',
  amount numeric(12,2) not null default 0,
  tx_year int generated always as (extract(year from tx_date)::int) stored,
  tx_month int generated always as (extract(month from tx_date)::int) stored,
  created_at timestamptz default now()
);

-- 3. Vehicle Information (multiple vehicles per user per year)
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year int not null,
  vehicle_model text default '',
  vehicle_type text default '',
  vehicle_cost numeric(12,2) default 0,
  date_in_service date,
  business_miles numeric(12,1) default 0,
  commuting_miles numeric(12,1) default 0,
  other_miles numeric(12,1) default 0,
  available_personal_off_duty boolean default false,
  another_vehicle_available boolean default true,
  evidence_to_support boolean default true,
  evidence_written boolean default true,
  created_at timestamptz default now()
);

-- 4. Cost of Goods Sold (per user per year)
create table if not exists public.cogs_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year int not null,
  beginning_inventory numeric(12,2) default 0,
  inventory_diff_explanation text default '',
  purchases_less_personal numeric(12,2) default 0,
  cost_of_labor numeric(12,2) default 0,
  materials_supplies numeric(12,2) default 0,
  other_costs numeric(12,2) default 0,
  ending_inventory numeric(12,2) default 0,
  updated_at timestamptz default now(),
  unique (user_id, tax_year)
);

-- 5. Home Office Deduction (per user per year)
create table if not exists public.home_office_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year int not null,
  total_home_sqft numeric(10,2) default 0,
  business_area_sqft numeric(10,2) default 0,
  calculation_method text default 'Simplified' check (calculation_method in ('Simplified', 'Actual')),
  indirect_expenses numeric(12,2) default 0,
  direct_expenses numeric(12,2) default 0,
  updated_at timestamptz default now(),
  unique (user_id, tax_year)
);

-- Enable Row Level Security (RLS) so each user ONLY sees their own data
alter table public.business_profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.vehicles enable row level security;
alter table public.cogs_records enable row level security;
alter table public.home_office_records enable row level security;

create policy "Users manage own profile" on public.business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own vehicles" on public.vehicles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own cogs" on public.cogs_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own home office" on public.home_office_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
