import { supabase } from './supabase';

export const DEFAULT_BRAND = {
  id: 'default',
  slug: 'default',
  brand_name: 'Simple Bookkeeping & Schedule C',
  tagline: 'Simple Multi-Year Business Ledger & Schedule C Reports',
  logo_url: null,
  primary_color: '#059669',
  support_email: null,
  is_active: true,
};

/**
 * Resolves the active tenant organization from Supabase.
 * Priority:
 * 1. Explicit URL query parameter (?office=slug)
 * 2. Optional organizationId (e.g., from the logged-in user's membership record)
 * 3. Active 'default' row in public.organizations, or local DEFAULT_BRAND fallback
 */
export async function resolveTenantOrganization(organizationId = null) {
  try {
    const params = new URLSearchParams(window.location.search);
    const officeSlug = params.get('office')?.trim().toLowerCase();

    // 1. Lookup by ?office=slug in URL
    if (officeSlug) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', officeSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        return data;
      }

      console.warn(`Active organization not found for slug "${officeSlug}", falling back to default.`);
    }

    // 2. Lookup by authenticated user's organization_id (if provided)
    if (organizationId && organizationId !== 'default') {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    }

    // 3. Check for a 'default' organization record in Supabase
    const { data: defaultOrg, error: defaultError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'default')
      .eq('is_active', true)
      .maybeSingle();

    if (!defaultError && defaultOrg) {
      return defaultOrg;
    }

    return DEFAULT_BRAND;
  } catch (err) {
    console.warn('Error resolving tenant organization from Supabase:', err);
    return DEFAULT_BRAND;
  }
}

/**
 * Helper to fetch a specific organization by ID (used after login when loading membership).
 */
export async function fetchOrganizationById(organizationId) {
  if (!organizationId || organizationId === 'default') {
    return DEFAULT_BRAND;
  }

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_BRAND;
    }

    return data;
  } catch (err) {
    console.warn('Error fetching organization by ID:', err);
    return DEFAULT_BRAND;
  }
}
