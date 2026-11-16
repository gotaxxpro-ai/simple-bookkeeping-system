-- Simple Bookkeeping System v3.0 — Multi-Tenant White-Label Schema
-- Safe to run on both fresh and existing v2.x databases!

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. MULTI-TENANT WHITE-LABEL TABLES (Tax Offices & Memberships)
-- ============================================================================

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  brand_name text not null,
  tagline text default 'Small Business Bookkeeping & Schedule C Reports',
  logo_url text default '',
  primary_color text default '#059669',
  support_email text default '',
  booking_url text default '',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed default master organization (GoTaxx Pro) so direct visits always have branding
insert into public.organizations (slug, brand_name, tagline, primary_color, support_email)
values (
  'default',
  'GoTaxx Pro Bookkeeping',
  'Multi-Year Small Business Ledger & Schedule C Reports',
  '#059669',
  'gotaxxpro@gmail.com'
)
on conflict (slug) do nothing;

create table if not exists public.user_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'office_admin', 'super_admin')),
  full_name text default '',
  email text default '',
  created_at timestamptz default now()
);

-- Helper functions to avoid RLS recursion when checking admin access
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_memberships
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.admin_org_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from public.user_memberships
  where user_id = auth.uid() and role in ('office_admin', 'super_admin')
  limit 1;
$$;

-- ============================================================================
-- 2. BOOKKEEPING DATA TABLES (Backward-compatible with v2.x)
-- ============================================================================

create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text default '',
  business_activity text default '',
  naics_code text default '',
  updated_at timestamptz default now()
);

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

create table if not exists public.owners_draws (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_date date not null,
  payment_method text default 'Bank Transfer / ACH',
  description text default '',
  amount numeric(12,2) not null default 0,
  draw_year int generated always as (extract(year from draw_date)::int) stored,
  draw_month int generated always as (extract(month from draw_date)::int) stored,
  created_at timestamptz default now()
);

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

-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.user_memberships enable row level security;
alter table public.business_profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.owners_draws enable row level security;
alter table public.vehicles enable row level security;
alter table public.cogs_records enable row level security;
alter table public.home_office_records enable row level security;

-- Organizations policies
drop policy if exists "Public can read active orgs" on public.organizations;
create policy "Public can read active orgs" on public.organizations
  for select using (is_active = true or public.is_super_admin());

drop policy if exists "Office admins update own org" on public.organizations;
create policy "Office admins update own org" on public.organizations
  for update using (id = public.admin_org_id() or public.is_super_admin());

drop policy if exists "Super admins manage all orgs" on public.organizations;
create policy "Super admins manage all orgs" on public.organizations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- User memberships policies
drop policy if exists "Users insert own membership" on public.user_memberships;
create policy "Users insert own membership" on public.user_memberships
  for insert with check (auth.uid() = user_id or public.is_super_admin());

drop policy if exists "Users read own or org memberships" on public.user_memberships;
create policy "Users read own or org memberships" on public.user_memberships
  for select using (
    auth.uid() = user_id
    or organization_id = public.admin_org_id()
    or public.is_super_admin()
  );

drop policy if exists "Admins update memberships in org" on public.user_memberships;
create policy "Admins update memberships in org" on public.user_memberships
  for update using (
    organization_id = public.admin_org_id()
    or public.is_super_admin()
  );

-- Business Profiles (Users manage own; Office Admins view clients in their org)
drop policy if exists "Users manage own profile" on public.business_profiles;
create policy "Users manage own profile" on public.business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org profiles" on public.business_profiles;
create policy "Office admins read org profiles" on public.business_profiles
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = business_profiles.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- Transactions (Users manage own; Office Admins view clients in their org)
drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org transactions" on public.transactions;
create policy "Office admins read org transactions" on public.transactions
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = transactions.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- Owner's Draws
drop policy if exists "Users manage own draws" on public.owners_draws;
create policy "Users manage own draws" on public.owners_draws
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org draws" on public.owners_draws;
create policy "Office admins read org draws" on public.owners_draws
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = owners_draws.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- Vehicles
drop policy if exists "Users manage own vehicles" on public.vehicles;
create policy "Users manage own vehicles" on public.vehicles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org vehicles" on public.vehicles;
create policy "Office admins read org vehicles" on public.vehicles
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = vehicles.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- COGS
drop policy if exists "Users manage own cogs" on public.cogs_records;
create policy "Users manage own cogs" on public.cogs_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org cogs" on public.cogs_records;
create policy "Office admins read org cogs" on public.cogs_records
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = cogs_records.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- Home Office
drop policy if exists "Users manage own home office" on public.home_office_records;
create policy "Users manage own home office" on public.home_office_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Office admins read org home office" on public.home_office_records;
create policy "Office admins read org home office" on public.home_office_records
  for select using (
    exists (
      select 1 from public.user_memberships m
      where m.user_id = home_office_records.user_id
        and (m.organization_id = public.admin_org_id() or public.is_super_admin())
    )
  );

-- ============================================================================
-- 4. STRIPE BILLING & AUTOMATED TENANT PROVISIONING (v3.2)
-- ============================================================================

alter table public.organizations
  add column if not exists plan_tier text default 'service_bureau',
  add column if not exists max_clients int default 999999,
  add column if not exists subscription_status text default 'active',
  add column if not exists stripe_customer_id text default '',
  add column if not exists stripe_subscription_id text default '',
  add column if not exists current_period_end timestamptz;

-- Stores pre-checkout onboarding details before redirecting to Stripe Payment Link
create table if not exists public.pending_checkouts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null,
  brand_name text not null,
  admin_email text not null,
  plan_tier text not null default 'service_bureau',
  primary_color text default '#059669',
  logo_url text default '',
  status text default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz default now()
);

alter table public.pending_checkouts enable row level security;

drop policy if exists "Public can insert pending checkouts" on public.pending_checkouts;
create policy "Public can insert pending checkouts" on public.pending_checkouts
  for insert with check (true);

drop policy if exists "Super admins read pending checkouts" on public.pending_checkouts;
create policy "Super admins read pending checkouts" on public.pending_checkouts
  for select using (public.is_super_admin());
