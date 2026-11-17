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

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase environment secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 2. Verify caller is an active super_admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerMembership, error: roleError } = await adminClient
      .from('user_memberships')
      .select('role, is_active')
      .eq('user_id', caller.id)
      .single();

    if (roleError || !callerMembership?.is_active || callerMembership.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only an active super_admin can provision tax offices' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request body
    const {
      slug,
      brand_name,
      tagline,
      primary_color,
      support_email,
      admin_email,
      admin_password,
      admin_full_name,
    } = await req.json();

    const cleanSlug = (slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const cleanBrandName = (brand_name || '').trim();
    const cleanAdminEmail = (admin_email || '').trim().toLowerCase();
    const cleanSupportEmail = (support_email || cleanAdminEmail).trim().toLowerCase();
    const cleanAdminName =
      (admin_full_name || '').trim() || `${cleanBrandName || 'Office'} Admin`;

    if (!cleanSlug || !cleanBrandName || !cleanAdminEmail || !admin_password) {
      return new Response(
        JSON.stringify({
          error: 'Slug, brand name, admin email, and temporary password are all required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cleanSlug === 'default') {
      return new Response(
        JSON.stringify({ error: 'The slug "default" is reserved by the platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (admin_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Admin password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if slug already exists
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: `A tax office with slug "${cleanSlug}" already exists` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Insert the new organization
    const { data: createdOrg, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        slug: cleanSlug,
        brand_name: cleanBrandName,
        tagline:
          (tagline || '').trim() || 'Simple Multi-Year Business Ledger & Schedule C Reports',
        primary_color: primary_color || '#059669',
        support_email: cleanSupportEmail || null,
        is_active: true,
      })
      .select()
      .single();

    if (orgError || !createdOrg) {
      return new Response(
        JSON.stringify({
          error: `Could not create tax office record: ${orgError?.message || 'Unknown error'}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Provision the Office Admin Auth user (auto-confirmed so they can log in immediately)
    const { data: createdAuth, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: cleanAdminEmail,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanAdminName,
        office_slug: createdOrg.slug,
        role: 'office_admin',
      },
    });

    if (authCreateError || !createdAuth.user) {
      // Roll back the organization row if Auth user creation fails (e.g., email already registered)
      await adminClient.from('organizations').delete().eq('id', createdOrg.id);
      return new Response(
        JSON.stringify({
          error: `Could not create admin login: ${authCreateError?.message || 'Unknown error'}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Upsert user_memberships with email, full_name, organization_id, and office_admin role
    const { error: membershipError } = await adminClient
      .from('user_memberships')
      .upsert(
        {
          user_id: createdAuth.user.id,
          organization_id: createdOrg.id,
          role: 'office_admin',
          is_active: true,
          email: cleanAdminEmail,
          full_name: cleanAdminName,
        },
        { onConflict: 'user_id' }
      );

    if (membershipError) {
      // Roll back both Auth user and organization row
      await adminClient.auth.admin.deleteUser(createdAuth.user.id);
      await adminClient.from('organizations').delete().eq('id', createdOrg.id);
      return new Response(
        JSON.stringify({
          error: `Could not assign office_admin membership: ${membershipError.message}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization: createdOrg,
        admin_user: {
          id: createdAuth.user.id,
          email: cleanAdminEmail,
          full_name: cleanAdminName,
          role: 'office_admin',
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
