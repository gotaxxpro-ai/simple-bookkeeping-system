import { supabase } from './supabase';

export const DEFAULT_BRAND = {
  id: null,
  slug: 'default',
  brand_name: 'Simple Bookkeeping System',
  tagline: 'Multi-Year Small Business Ledger & Schedule C Reports',
  logo_url: '/logo.png',
  primary_color: '#059669',
  support_email: '',
  booking_url: '',
};

// Detects tenant slug from ?office=slug OR subdomain (e.g., apextax.yourdomain.com)
export function detectRequestedSlug() {
  if (typeof window === 'undefined') return 'default';

  const params = new URLSearchParams(window.location.search);
  const queryOffice = params.get('office');
  if (queryOffice) {
    const clean = queryOffice.trim().toLowerCase();
    localStorage.setItem('active_office_slug', clean);
    return clean;
  }

  // Check subdomain if not localhost or raw IP
  const host = window.location.hostname.toLowerCase();
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
    return parts[0];
  }

  return localStorage.getItem('active_office_slug') || 'default';
}

export async function resolveTenantOrganization(userId = null) {
  if (!supabase) return DEFAULT_BRAND;

  // 1. If user is logged in, check if they already belong to a specific organization
  if (userId) {
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, organizations(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (membership?.organizations) {
      return membership.organizations;
    }
  }

  // 2. Otherwise resolve from ?office=slug or subdomain
  const slug = detectRequestedSlug();
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (org) return org;

  // 3. Fallback to 'default' row in organizations if present
  const { data: fallbackOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', 'default')
    .maybeSingle();

  return fallbackOrg || DEFAULT_BRAND;
}
