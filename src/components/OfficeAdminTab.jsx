import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Palette,
  Mail,
  ShieldCheck,
  ExternalLink,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import BookkeepingLedger from './BookkeepingLedger';

export default function OfficeAdminTab({ membership, currentOrg, onOrgUpdated }) {
  const isSuperAdmin = membership?.role === 'super_admin';
  const isOfficeAdmin = membership?.role === 'office_admin';

  // Selected client for read-only Schedule C ledger inspection
  const [inspectingClient, setInspectingClient] = useState(null);

  // Resolved organization for the active admin
  const [resolvedOrg, setResolvedOrg] = useState(null);
  const [loadingOrgDetails, setLoadingOrgDetails] = useState(true);

  // Client & member list for the organization
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Add Client form state (for office_admin and super_admin)
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '',
    email: '',
    password: '',
    organization_id: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // List of all organizations (for super_admin)
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Branding editor state
  const [brandForm, setBrandForm] = useState({
    brand_name: '',
    tagline: '',
    primary_color: '#059669',
    logo_url: '',
    support_email: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);

  // New Tax Office creation state (super_admin)
  const [showNewOfficeForm, setShowNewOfficeForm] = useState(false);
  const [newOffice, setNewOffice] = useState({
    slug: '',
    brand_name: '',
    tagline: 'Simple Multi-Year Business Ledger & Schedule C Reports',
    primary_color: '#059669',
    support_email: '',
    admin_email: '',
    admin_password: '',
  });
  const [creatingOffice, setCreatingOffice] = useState(false);

  // Feedback banner
  const [statusMessage, setStatusMessage] = useState(null);

  // 1. Resolve database organization record
  useEffect(() => {
    let isMounted = true;

    async function loadAdminOrganization() {
      setLoadingOrgDetails(true);
      try {
        if (currentOrg && currentOrg.id && currentOrg.id !== 'default') {
          if (isMounted) {
            setResolvedOrg(currentOrg);
            setBrandForm({
              brand_name: currentOrg.brand_name || '',
              tagline: currentOrg.tagline || '',
              primary_color: currentOrg.primary_color || '#059669',
              logo_url: currentOrg.logo_url || '',
              support_email: currentOrg.support_email || '',
            });
          }
          return;
        }

        if (membership?.organization_id) {
          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', membership.organization_id)
            .maybeSingle();

          if (!error && data && isMounted) {
            setResolvedOrg(data);
            setBrandForm({
              brand_name: data.brand_name || '',
              tagline: data.tagline || '',
              primary_color: data.primary_color || '#059669',
              logo_url: data.logo_url || '',
              support_email: data.support_email || '',
            });
          }
        }
      } finally {
        if (isMounted) setLoadingOrgDetails(false);
      }
    }

    loadAdminOrganization();
    return () => {
      isMounted = false;
    };
  }, [currentOrg, membership?.organization_id]);

  // 2. Fetch client & staff list (and all organizations if super_admin)
  useEffect(() => {
    if (isSuperAdmin || isOfficeAdmin) {
      fetchMembers();
    }
    if (isSuperAdmin) {
      fetchAllOrganizations();
    }
  }, [isSuperAdmin, isOfficeAdmin, membership?.organization_id]);

  const fetchMembers = async () => {
    if (!membership?.role) return;
    setLoadingMembers(true);

    try {
      let query = supabase
        .from('user_memberships')
        .select(`
          user_id,
          organization_id,
          role,
          is_active,
          email,
          full_name,
          created_at,
          organizations (
            slug,
            brand_name
          )
        `)
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        if (!membership.organization_id) {
          setMembers([]);
          setLoadingMembers(false);
          return;
        }
        query = query
          .eq('organization_id', membership.organization_id)
          .neq('role', 'super_admin');
      }

      const { data, error } = await query;
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to load client list: ${err.message}` });
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchAllOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to load tax offices: ${err.message}` });
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Create a new client account under this tax office
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    setStatusMessage(null);

    try {
      const targetOrgId = isSuperAdmin
        ? newClient.organization_id || resolvedOrg?.id || membership?.organization_id
        : resolvedOrg?.id || membership?.organization_id;

      const { data, error } = await supabase.functions.invoke('create-office-client', {
        body: {
          full_name: newClient.full_name.trim(),
          email: newClient.email.trim().toLowerCase(),
          password: newClient.password,
          organization_id: targetOrgId,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStatusMessage({
        type: 'success',
        text: `Client account created for ${data.client.full_name} (${data.client.email}). They can log in immediately.`,
      });

      setNewClient({
        full_name: '',
        email: '',
        password: '',
        organization_id: '',
      });
      setShowAddClientForm(false);
      fetchMembers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingClient(false);
    }
  };

  // Update white-label branding
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    if (!resolvedOrg?.id || resolvedOrg.id === 'default') {
      setStatusMessage({ type: 'error', text: 'No database organization linked to this account.' });
      return;
    }

    setSavingBrand(true);
    setStatusMessage(null);

    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          brand_name: brandForm.brand_name.trim(),
          tagline: brandForm.tagline.trim(),
          primary_color: brandForm.primary_color,
          logo_url: brandForm.logo_url.trim() || null,
          support_email: brandForm.support_email.trim() || null,
        })
        .eq('id', resolvedOrg.id)
        .select()
        .single();

      if (error) throw error;

      setResolvedOrg(data);
      setStatusMessage({ type: 'success', text: 'White-label branding saved successfully.' });
      if (onOrgUpdated) onOrgUpdated(data);
      if (isSuperAdmin) fetchAllOrganizations();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Could not save branding: ${err.message}` });
    } finally {
      setSavingBrand(false);
    }
  };

  // Single clean implementation: Toggle client active/suspended status via secure RPC
  const handleToggleMemberStatus = async (member) => {
    if (member.user_id === membership?.user_id) {
      setStatusMessage({ type: 'error', text: 'You cannot suspend your own administrator account.' });
      return;
    }

    try {
      const { data: newStatus, error } = await supabase.rpc('toggle_client_active_status', {
        target_user_id: member.user_id,
      });

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, is_active: newStatus } : m))
      );
      setStatusMessage({
        type: 'success',
        text: `Account for ${member.full_name || member.email} is now ${
          newStatus ? 'Active' : 'Suspended'
        }.`,
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to update user status: ${err.message}` });
    }
  };

  // Create a new tax office + Auth admin user via Edge Function (super_admin)
  const handleCreateTaxOffice = async (e) => {
    e.preventDefault();
    setCreatingOffice(true);
    setStatusMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-tax-office', {
        body: {
          slug: newOffice.slug.trim().toLowerCase(),
          brand_name: newOffice.brand_name.trim(),
          tagline: newOffice.tagline.trim(),
          primary_color: newOffice.primary_color,
          support_email: newOffice.support_email.trim() || newOffice.admin_email.trim(),
          admin_email: newOffice.admin_email.trim(),
          admin_password: newOffice.admin_password,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStatusMessage({
        type: 'success',
        text: `Tax office "${data.organization.brand_name}" and admin login (${data.admin_user.email}) created!`,
      });

      setNewOffice({
        slug: '',
        brand_name: '',
        tagline: 'Simple Multi-Year Business Ledger & Schedule C Reports',
        primary_color: '#059669',
        support_email: '',
        admin_email: '',
        admin_password: '',
      });
      setShowNewOfficeForm(false);
      fetchAllOrganizations();
      fetchMembers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingOffice(false);
    }
  };

  // Toggle active/suspended status of an organization (super_admin)
  const handleToggleOrgStatus = async (org
