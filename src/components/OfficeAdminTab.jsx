import React, { useState, useEffect } from 'react';
import { Building2, Plus, Save, CheckCircle2, AlertCircle, Globe, Palette, Mail, ShieldCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function OfficeAdminTab({ membership, currentOrg, onOrgUpdated }) {
  const isSuperAdmin = membership?.role === 'super_admin';
  const isOfficeAdmin = membership?.role === 'office_admin';

  // List of all organizations (for super_admin)
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Branding editor state (for current organization)
  const [brandForm, setBrandForm] = useState({
    brand_name: '',
    tagline: '',
    primary_color: '#059669',
    logo_url: '',
    support_email: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);

  // New Tax Office creation state (for super_admin)
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

  // Populate branding form when currentOrg loads
  useEffect(() => {
    if (currentOrg && currentOrg.id !== 'default') {
      setBrandForm({
        brand_name: currentOrg.brand_name || '',
        tagline: currentOrg.tagline || '',
        primary_color: currentOrg.primary_color || '#059669',
        logo_url: currentOrg.logo_url || '',
        support_email: currentOrg.support_email || '',
      });
    }
  }, [currentOrg]);

  // Fetch all organizations if user is super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllOrganizations();
    }
  }, [isSuperAdmin]);

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

  // Update branding for the current organization
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    if (!currentOrg?.id || currentOrg.id === 'default') {
      setStatusMessage({ type: 'error', text: 'No database organization linked to this session.' });
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
        .eq('id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      setStatusMessage({ type: 'success', text: 'White-label branding saved successfully.' });
      if (onOrgUpdated) onOrgUpdated(data);
      if (isSuperAdmin) fetchAllOrganizations();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Could not save branding: ${err.message}` });
    } finally {
      setSavingBrand(false);
    }
  };

  // Create a new tax office + Auth admin user via Edge Function
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
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingOffice(false);
    }
  };

  // Toggle active/suspended status of an organization (super_admin only)
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

  if (!isSuperAdmin && !isOfficeAdmin) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        Access denied. Administrator privileges are required to view this section.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Status Banner */}
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

      {/* SECTION 1: WHITE-LABEL BRANDING SETTINGS (For Current Organization) */}
      {currentOrg && currentOrg.id !== 'default' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                White-Label Branding ({currentOrg.slug})
              </h2>
            </div>
            <a
              href={`${window.location.origin}/?office=${currentOrg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Preview Portal Link <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <form onSubmit={handleSaveBranding} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand / Tax Office Name
                </label>
                <input
                  type="text"
                  required
                  value={brandForm.brand_name}
                  onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={brandForm.support_email}
                  onChange={(e) => setBrandForm({ ...brandForm, support_email: e.target.value })}
                  placeholder="support@yourtaxoffice.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Portal Tagline
                </label>
                <input
                  type="text"
                  value={brandForm.tagline}
                  onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Logo Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={brandForm.logo_url}
                  onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand Primary Color
                </label>
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
      )}

      {/* SECTION 2: SUPER ADMIN TAX OFFICE MANAGEMENT */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Tax Office Network Management
              </h2>
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

          {/* Add New Tax Office Form */}
          {showNewOfficeForm && (
            <form
              onSubmit={handleCreateTaxOffice}
              className="p-6 bg-emerald-50/50 border-b border-slate-200 space-y-4"
            >
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                Provision New Tax Office & Admin Login
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Office Brand Name *
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Office Admin Login Email *
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Temporary Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={newOffice.admin_password}
                    onChange={(e) =>
                      setNewOffice({ ...newOffice, admin_password: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Support Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="Defaults to admin email"
                    value={newOffice.support_email}
                    onChange={(e) =>
                      setNewOffice({ ...newOffice, support_email: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newOffice.primary_color}
                      onChange={(e) =>
                        setNewOffice({ ...newOffice, primary_color: e.target.value })
                      }
                      className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">
                      {newOffice.primary_color}
                    </span>
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

          {/* Directory Table of Tax Offices */}
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
                            org.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
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
