import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Save, CheckCircle2, AlertCircle, Globe, Palette,
  Mail, ShieldCheck, ExternalLink, Users, UserCheck, UserX, UserPlus,
  BookOpen, ArrowLeft, Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import BookkeepingLedger from './BookkeepingLedger';

export default function OfficeAdminTab({ membership, currentOrg, onOrgUpdated }) {
  const isSuperAdmin = (membership?.role || '').toLowerCase() === 'super_admin';
  const isOfficeAdmin = (membership?.role || '').toLowerCase() === 'office_admin';

  const [inspectingClient, setInspectingClient] = useState(null);
  const [resolvedOrg, setResolvedOrg] = useState(null);
  const [loadingOrgDetails, setLoadingOrgDetails] = useState(true);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Directory filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');

  // Add Client form state
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '',
    email: '',
    password: '',
    organization_id: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Tax offices list (super_admin)
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // White-label branding editor
  const [brandForm, setBrandForm] = useState({
    brand_name: '',
    tagline: '',
    primary_color: '#059669',
    logo_url: '',
    support_email: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);

  // New Tax Office provisioning (super_admin)
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
  const [statusMessage, setStatusMessage] = useState(null);

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

  useEffect(() => {
    if (isSuperAdmin || isOfficeAdmin) fetchMembers();
    if (isSuperAdmin) fetchAllOrganizations();
  }, [isSuperAdmin, isOfficeAdmin, membership?.organization_id]);

  const fetchMembers = async () => {
    if (!membership?.role) return;
    setLoadingMembers(true);
    try {
      let query = supabase
        .from('user_memberships')
        .select('user_id, organization_id, role, is_active, email, full_name, created_at, organizations(slug, brand_name)')
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

const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    setStatusMessage(null);
    try {
      const targetOrgId = isSuperAdmin
        ? newClient.organization_id ||
          resolvedOrg?.id ||
          membership?.organization_id ||
          organizations[0]?.id ||
          ''
        : resolvedOrg?.id || membership?.organization_id || '';

      if (!targetOrgId) {
        throw new Error('No tax office organization selected or linked to your account.');
      }

      const { data, error } = await supabase.functions.invoke('create-office-client', {
        body: {
          full_name: newClient.full_name.trim(),
          email: newClient.email.trim().toLowerCase(),
          password: newClient.password,
          organization_id: targetOrgId,
        },
      });

      if (error) {
        let detailedMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errBody = await error.context.json();
            if (errBody?.error) detailedMsg = errBody.error;
          }
        } catch (_) {
          // Fall back to generic error message if body isn't JSON
        }
        throw new Error(detailedMsg);
      }

      if (data?.error) throw new Error(data.error);

      setStatusMessage({
        type: 'success',
        text: `Client account created for ${data.client.full_name} (${data.client.email}).`,
      });
      setNewClient({ full_name: '', email: '', password: '', organization_id: '' });
      setShowAddClientForm(false);
      fetchMembers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingClient(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const handleToggleMemberStatus = async (member) => {
    if (member.user_id === membership?.user_id) {
      setStatusMessage({ type: 'error', text: 'You cannot suspend your own administrator account.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        text: `Account for ${member.full_name || member.email} is now ${newStatus ? 'Active' : 'Suspended'}.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Could not suspend/activate client: ${err.message}`,
      });
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
      if (error) {
        let detailedMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errBody = await error.context.json();
            if (errBody?.error) detailedMsg = errBody.error;
          }
        } catch (_) {
          // Ignore JSON parse fallback
        }
        throw new Error(detailedMsg);
      }
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleOrgStatus = async (org) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active })
        .eq('id', org.id);
      if (error) throw error;
      fetchAllOrganizations();
      setStatusMessage({
        type: 'success',
        text: `${org.brand_name} is now ${!org.is_active ? 'Active' : 'Suspended'}.`,
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to update status: ${err.message}` });
    }
  };

  const roleCounts = {
    all: members.length,
    super_admin: members.filter((m) => (m.role || '').toLowerCase() === 'super_admin').length,
    office_admin: members.filter((m) => (m.role || '').toLowerCase() === 'office_admin').length,
    client: members.filter((m) => (m.role || 'client').toLowerCase() === 'client').length,
  };

  const filteredMembers = members.filter((m) => {
    const normalizedRole = (m.role || 'client').toLowerCase();
    if (roleFilter !== 'all' && normalizedRole !== roleFilter) return false;
    if (isSuperAdmin && officeFilter !== 'all' && m.organization_id !== officeFilter) return false;

    if (memberSearch.trim()) {
      const q = memberSearch.trim().toLowerCase();
      const nameMatch = (m.full_name || '').toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      const officeMatch = (m.organizations?.brand_name || '').toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !officeMatch) return false;
    }

    return true;
  });
  if (!isSuperAdmin && !isOfficeAdmin) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        Access denied. Administrator privileges are required to view this section.
      </div>
    );
  }

  if (inspectingClient) {
    const clientLabel = inspectingClient.full_name || inspectingClient.email || 'Client';
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setInspectingClient(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {isSuperAdmin ? 'Platform & Office Admin' : 'Office Clients'}
          </button>
          <div className="text-xs text-slate-500">
            Client Email: <span className="font-mono text-slate-700">{inspectingClient.email || '—'}</span>
          </div>
        </div>
        <BookkeepingLedger
          targetUserId={inspectingClient.user_id}
          targetUserName={clientLabel}
          readOnly={true}
          primaryColor={resolvedOrg?.primary_color || currentOrg?.primary_color || '#059669'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: WHITE-LABEL BRANDING */}
      {loadingOrgDetails ? (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
          Loading tax office settings...
        </div>
      ) : resolvedOrg ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                White-Label Branding ({resolvedOrg.slug})
              </h2>
            </div>
            <a
              href={`${window.location.origin}/?office=${resolvedOrg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Client Signup &amp; Portal Link <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <form onSubmit={handleSaveBranding} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand / Tax Office Name</label>
                <input
                  type="text"
                  required
                  value={brandForm.brand_name}
                  onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={brandForm.support_email}
                  onChange={(e) => setBrandForm({ ...brandForm, support_email: e.target.value })}
                  placeholder="support@yourtaxoffice.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Portal Tagline</label>
                <input
                  type="text"
                  value={brandForm.tagline}
                  onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo Image URL (Optional)</label>
                <input
                  type="url"
                  value={brandForm.logo_url}
                  onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandForm.primary_color}
                    onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                    className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandForm.primary_color}
                    onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingBrand}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingBrand ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
          Your administrator account is not linked to a specific organization yet.
        </div>
      )}

      {/* SECTION 2: OFFICE CLIENT & MEMBER DIRECTORY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {isSuperAdmin ? 'All Users & Clients' : 'Office Clients & Staff'}
            </h2>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredMembers.length === members.length
                ? members.length
                : `${filteredMembers.length} of ${members.length}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddClientForm(!showAddClientForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            {showAddClientForm ? 'Cancel' : 'Add Client'}
          </button>
        </div>

        {/* Role Filter Pills + Tax Office Filter + Search Box */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(isSuperAdmin
              ? [
                  { id: 'all', label: 'All', count: roleCounts.all },
                  { id: 'super_admin', label: 'Super Admins', count: roleCounts.super_admin },
                  { id: 'office_admin', label: 'Office Admins', count: roleCounts.office_admin },
                  { id: 'client', label: 'Clients', count: roleCounts.client },
                ]
              : [
                  { id: 'all', label: 'All', count: roleCounts.all },
                  { id: 'client', label: 'Clients', count: roleCounts.client },
                  { id: 'office_admin', label: 'Office Staff', count: roleCounts.office_admin },
                ]
            ).map((pill) => {
              const active = roleFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRoleFilter(pill.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && organizations.length > 0 && (
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                aria-label="Filter by Tax Office"
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Tax Offices</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.brand_name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {showAddClientForm && (
          <form onSubmit={handleCreateClient} className="p-6 bg-emerald-50/50 border-b border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Create Client Bookkeeping Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={newClient.full_name}
                  onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Email *</label>
                <input
                  type="email"
                  required
                  placeholder="jane@clientbusiness.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newClient.password}
                  onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              {isSuperAdmin && organizations.length > 0 && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Tax Office</label>
                  <select
                    value={newClient.organization_id || resolvedOrg?.id || ''}
                    onChange={(e) => setNewClient({ ...newClient, organization_id: e.target.value })}
                    className="w-full md:w-1/2 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.brand_name} ({org.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={creatingClient}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {creatingClient ? 'Creating Client Account...' : 'Create Client Login'}
              </button>
            </div>
            const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    setStatusMessage(null);
    try {
      const targetOrgId = isSuperAdmin
        ? newClient.organization_id ||
          resolvedOrg?.id ||
          membership?.organization_id ||
          organizations[0]?.id ||
          ''
        : resolvedOrg?.id || membership?.organization_id || '';

      if (!targetOrgId) {
        throw new Error('No tax office organization selected or linked to your account.');
      }

      const { data, error } = await supabase.functions.invoke('create-office-client', {
        body: {
          full_name: newClient.full_name.trim(),
          email: newClient.email.trim().toLowerCase(),
          password: newClient.password,
          organization_id: targetOrgId,
        },
      });

      if (error) {
        let detailedMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errBody = await error.context.json();
            if (errBody?.error) detailedMsg = errBody.error;
          }
        } catch (_) {
          // Fall back to generic error message if body isn't JSON
        }
        throw new Error(detailedMsg);
      }

      if (data?.error) throw new Error(data.error);

      setStatusMessage({
        type: 'success',
        text: `Client account created for ${data.client.full_name} (${data.client.email}).`,
      });
      setNewClient({ full_name: '', email: '', password: '', organization_id: '' });
      setShowAddClientForm(false);
      fetchMembers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingClient(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-6">Client / User</th>
                {isSuperAdmin && <th className="py-3 px-6">Tax Office</th>}
                <th className="py-3 px-6">Role</th>
                <th className="py-3 px-6">Joined</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loadingMembers ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-slate-500">
                    Loading client directory...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-slate-500">
                    {members.length === 0 ? (
                      'No clients registered under this office yet.'
                    ) : (
                      <span>
                        No users match the selected filter.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setRoleFilter('all');
                            setOfficeFilter('all');
                            setMemberSearch('');
                          }}
                          className="text-emerald-700 font-semibold underline"
                        >
                          Clear filters
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const memberRole = (member.role || 'client').toLowerCase();
                  return (
                    <tr key={member.user_id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-slate-900">{member.full_name || 'Unnamed User'}</div>
                        <div className="text-xs text-slate-500">{member.email || member.user_id}</div>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3.5 px-6 text-xs text-slate-600">
                          {member.organizations?.brand_name || '—'}
                        </td>
                      )}
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            memberRole === 'super_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : memberRole === 'office_admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {memberRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-500">
                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {member.is_active ? (
                            <>
                              <UserCheck className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" /> Suspended
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectingClient(member)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            View Books
                          </button>
                          {member.user_id !== membership?.user_id &&
                          member.role !== 'super_admin' &&
                          (isSuperAdmin || (member.role || 'client').toLowerCase() === 'client') && (
                            <button
                              type="button"
                              onClick={() => handleToggleMemberStatus(member)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                member.is_active
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                              }`}
                            >
                              {member.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: SUPER ADMIN TAX OFFICE NETWORK MANAGEMENT */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">Tax Office Network Management</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewOfficeForm(!showNewOfficeForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {showNewOfficeForm ? 'Cancel' : 'Add Tax Office'}
            </button>
          </div>

          {showNewOfficeForm && (
            <form onSubmit={handleCreateTaxOffice} className="p-6 bg-emerald-50/50 border-b border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                Provision New Tax Office &amp; Admin Login
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Office Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., GoTaxx Atlanta"
                    value={newOffice.brand_name}
                    onChange={(e) => setNewOffice({ ...newOffice, brand_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL Slug * (used in ?office=slug)
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-xs text-slate-500">
                      ?office=
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="gotaxx-atlanta"
                      value={newOffice.slug}
                      onChange={(e) =>
                        setNewOffice({
                          ...newOffice,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-r-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Office Admin Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@gotaxxatlanta.com"
                    value={newOffice.admin_email}
                    onChange={(e) => setNewOffice({ ...newOffice, admin_email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Admin Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={newOffice.admin_password}
                    onChange={(e) => setNewOffice({ ...newOffice, admin_password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Support Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="Defaults to admin email"
                    value={newOffice.support_email}
                    onChange={(e) => setNewOffice({ ...newOffice, support_email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newOffice.primary_color}
                      onChange={(e) => setNewOffice({ ...newOffice, primary_color: e.target.value })}
                      className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{newOffice.primary_color}</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingOffice}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  {creatingOffice ? 'Creating Office & Login...' : 'Create Tax Office'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-6">Tax Office</th>
                  <th className="py-3 px-6">Portal Link</th>
                  <th className="py-3 px-6">Support</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loadingOrgs ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      Loading tax offices...
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No tax offices found.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-6 font-medium text-slate-900 flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: org.primary_color || '#059669' }}
                        />
                        {org.brand_name}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                        <a
                          href={`${window.location.origin}/?office=${org.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          /?office={org.slug}
                        </a>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">
                        {org.support_email ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {org.support_email}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {org.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {org.slug !== 'default' && (
                          <button
                            type="button"
                            onClick={() => handleToggleOrgStatus(org)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                          >
                            {org.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
