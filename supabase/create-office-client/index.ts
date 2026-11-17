import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Authenticate caller
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

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
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

    if (
      roleError ||
      !callerMembership?.is_active ||
      !['office_admin', 'super_admin'].includes(callerMembership.role)
    ) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: office_admin or super_admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request payload
    const { full_name, email, password, organization_id } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Client email and temporary password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Office admins are locked to their own organization_id; super_admins can specify one
    const targetOrgId =
      callerMembership.role === 'office_admin'
        ? callerMembership.organization_id
        : organization_id || callerMembership.organization_id;

    if (!targetOrgId) {
      return new Response(
        JSON.stringify({ error: 'No target tax office organization specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the target organization slug for user metadata
    const { data: targetOrg, error: orgLookupError } = await adminClient
      .from('organizations')
      .select('id, slug, brand_name')
      .eq('id', targetOrgId)
      .single();

    if (orgLookupError || !targetOrg) {
      return new Response(
        JSON.stringify({ error: 'Target tax office not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (full_name || '').trim() || cleanEmail.split('@')[0];

    // 4. Create the Auth user with email_confirm: true so the client can log in right away
    const { data: createdAuth, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: cleanAdminEmail,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: `${cleanBrandName} Admin`,
        office_slug: cleanSlug,
        role: 'office_admin',
        must_change_password: true,
      },
    });

    if (authCreateError || !createdAuth.user) {
      return new Response(
        JSON.stringify({ error: `Could not create client login: ${authCreateError?.message || 'Unknown error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Upsert the user_memberships row bound to the tax office
    const { error: membershipError } = await adminClient
      .from('user_memberships')
      .upsert(
        {
          user_id: createdAuth.user.id,
          organization_id: targetOrg.id,
          role: 'client',
          is_active: true,
          email: cleanEmail,
          full_name: cleanName,
        },
        { onConflict: 'user_id' }
      );

    if (membershipError) {
      await adminClient.auth.admin.deleteUser(createdAuth.user.id);
      return new Response(
        JSON.stringify({ error: `Could not assign client membership: ${membershipError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          user_id: createdAuth.user.id,
          email: cleanEmail,
          full_name: cleanName,
          organization_id: targetOrg.id,
          role: 'client',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
