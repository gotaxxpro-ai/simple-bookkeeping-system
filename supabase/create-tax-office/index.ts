// Inside supabase/functions/create-tax-office/index.ts (Step 5)
    const cleanAdminEmail = admin_email.trim().toLowerCase();

    const { error: membershipError } = await adminClient
      .from('user_memberships')
      .upsert(
        {
          user_id: createdAuth.user.id,
          organization_id: org.id,
          role: 'office_admin',
          is_active: true,
          email: cleanAdminEmail,
          full_name: `${brand_name.trim()} Admin`,
        },
        { onConflict: 'user_id' }
      );