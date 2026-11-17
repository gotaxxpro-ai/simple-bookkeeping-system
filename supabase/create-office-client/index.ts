import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Authenticate caller from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized caller' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify caller is an active office_admin or super_admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerMembership, error: roleError } = await adminClient
      .from('user_memberships')
      .select('role, organization_id, is_active')
      .eq('user_id', caller.id)
      .single();

    const callerRole = (callerMembership?.role || '').toLowerCase();

    if (
      roleError ||
      !callerMembership?.is_active ||
      !['super_admin', 'office_admin'].includes(callerRole)
    ) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: Active office_admin or super_admin privileges required',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse & validate request payload
    const { full_name, email, password, organization_id } = await req.json();

    if (!full_name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Client full name, email, and temporary password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Temporary password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce tenant scoping: office_admin is locked to their own organization_id
    const targetOrgId =
      callerRole === 'super_admin'
        ? organization_id || callerMembership.organization_id
        : callerMembership.organization_id;

    if (!targetOrgId) {
      return new Response(
        JSON.stringify({ error: 'No target organization_id assigned to this administrator account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the organization slug for user_metadata
    const { data: targetOrg, error: orgLookupError } = await adminClient
      .from('organizations')
      .select('id, slug, is_active')
      .eq('id', targetOrgId)
      .single();

    if (orgLookupError || !targetOrg) {
      return new Response(
        JSON.stringify({ error: 'Target tax office organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanFullName = full_name.trim();
    const cleanClientEmail = email.trim
