import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/constants';
import {
  Building2,
  Users,
  Copy,
  Check,
  Save,
  Eye,
  Plus,
  ShieldCheck,
  Palette,
  CreditCard,
} from 'lucide-react';

export default function OfficeAdminTab({
  tenant,
  membership,
  onTenantUpdated,
  onInspectClient,
  selectedYear,
}) {
  const isSuperAdmin = membership?.role === 'super_admin';

  // White-label branding form for the active organization
  const [brandForm, setBrandForm] = useState({
    brand_name: tenant?.brand_name || '',
    tagline: tenant?.tagline || '',
    logo_url: tenant?.logo_url || '',
    primary_color: tenant?.primary_color || '#059669',
    support_email: tenant?.support_email || '',
    booking_url: tenant?.booking_url || '',
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Clients inside this tax office
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Super Admin: manage all licensed tax offices
  const [allOrgs, setAllOrgs] = useState([]);
  const [newOrg, setNewOrg] = useState({
    slug: '',
    brand_name: '',
    support_email: '',
    primary_color: '#059669',
    logo_url: '',
  });
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    setBrandForm({
      brand_name: tenant?.brand_name || '',
      tagline: tenant?.tagline || '',
      logo_url: tenant?.logo_url || '',
      primary_color: tenant?.primary_color || '#059669',
      support_email: tenant?.support_email || '',
      booking_url: tenant?.booking_url || '',
    });
  }, [tenant]);

  useEffect(() => {
    loadOfficeClients();
    if (isSuperAdmin) {
      loadAllOrganizations();
    }
  }, [tenant?.id, selectedYear, isSuperAdmin]);

  const loadOfficeClients = async () => {
    if (!tenant?.id) return;
    setLoadingClients(true);

    const { data: members } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('organization_id', tenant.id)
      .order('created_at', { ascending: false });

    const { data: profiles } = await supabase.from('business_profiles').select('*');
    const { data: txs } = await supabase
      .from('transactions')
      .select('user_id, type, amount, tx_year')
      .eq('tx_year', selectedYear);

    const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const enriched = (members || []).map((m) => {
      const userTx = (txs || []).filter((t) => t.user_id === m.user_id);
      const income = userTx
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      const expenses = userTx
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        ...m,
        profile: profMap.get(m.user_id) || {},
        yearIncome: income,
        yearExpenses: expenses,
        yearProfit: income - expenses,
      };
    });

    setClients(enriched);
    setLoadingClients(false);
  };

  const loadAllOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAllOrgs(data);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setSavingBrand(true);
    const { data, error } = await supabase
      .from('organizations')
      .update(brandForm)
      .eq('id', tenant.id)
      .select()
      .single();
    if (!error && data) {
      onTenantUpdated(data);
      if (isSuperAdmin) loadAllOrganizations();
    }
    setSavingBrand(false);
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrg.slug || !newOrg.brand_name) return;
    setCreatingOrg(true);
    const cleanSlug = newOrg.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const { error } = await supabase.from('organizations').insert([
      {
        slug: cleanSlug,
        brand_name: newOrg.brand_name.trim(),
        support_email: newOrg.support_email.trim(),
        primary_color: newOrg.primary_color,
        logo_url: newOrg.logo_url.trim(),
      },
    ]);

    if (!error) {
      setNewOrg({
        slug: '',
        brand_name: '',
        support_email: '',
        primary_color: '#059669',
        logo_url: '',
      });
      loadAllOrganizations();
    }
    setCreatingOrg(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await supabase
      .from('user_memberships')
      .update({ role: newRole })
      .eq('user_id', userId);
    loadOfficeClients();
  };

  const customerPortalUrl = import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_URL || '';

  const shareableUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?office=${tenant?.slug || 'default'}`
      : '';

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* White-Label Link & Branding Customizer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                White-Label Tax Office Branding ({tenant?.brand_name})
              </h2>
              <p className="text-xs text-slate-500">
                Customize your logo, colors, and client invite link. Every client who registers through your link gets your branding automatically.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {customerPortalUrl && (
              <a
                href={customerPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Manage Stripe Billing ({(tenant?.plan_tier || 'solo').toUpperCase()})
              </a>
            )}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
            <span className="text-xs font-mono text-slate-700 truncate max-w-xs">
              {shareableUrl}
            </span>
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy Client Link'}
            </button>
          </div>
          </div>
        </div>

        <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Office Brand Name
            </label>
            <input
              type="text"
              required
              value={brandForm.brand_name}
              onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={brandForm.tagline}
              onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Logo Image URL (PNG/SVG)
            </label>
            <input
              type="text"
              value={brandForm.logo_url}
              onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })}
              placeholder="https://yourdomain.com/logo.png"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Brand Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandForm.primary_color}
                onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                className="h-9 w-14 border border-slate-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={brandForm.primary_color}
                onChange={(e) => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Office Support Email
            </label>
            <input
              type="email"
              value={brandForm.support_email}
              onChange={(e) => setBrandForm({ ...brandForm, support_email: e.target.value })}
              placeholder="taxes@youroffice.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Appointment Booking URL (Optional)
            </label>
            <input
              type="url"
              value={brandForm.booking_url}
              onChange={(e) => setBrandForm({ ...brandForm, booking_url: e.target.value })}
              placeholder="https://calendly.com/your-tax-office"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={savingBrand}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
            >
              <Save className="w-4 h-4" />
              {savingBrand ? 'Saving Branding...' : 'Save White-Label Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Client Roster & One-Click Schedule C Report Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900">
                Tax Office Clients ({selectedYear} Summary)
              </h3>
              <p className="text-xs text-slate-500">
                Click "Open Client Report" to view, print, or export any client's full Schedule C Dashboard.
              </p>
            </div>
          </div>
        </div>

        {loadingClients ? (
          <p className="text-sm text-slate-500 py-4">Loading client roster...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2.5 text-left">Client / Business</th>
                  <th className="py-2.5 text-left">Email</th>
                  <th className="py-2.5 text-left">Role</th>
                  <th className="py-2.5 text-right">{selectedYear} Income</th>
                  <th className="py-2.5 text-right">{selectedYear} Expenses</th>
                  <th className="py-2.5 text-right">Net Profit</th>
                  <th className="py-2.5 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.user_id} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <p className="font-semibold text-slate-800">
                        {c.profile?.business_name || c.full_name || 'Unnamed Business'}
                      </p>
                      {c.profile?.naics_code && (
                        <p className="text-[11px] text-slate-400">NAICS: {c.profile.naics_code}</p>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-600">{c.email || '—'}</td>
                    <td className="py-2.5">
                      <select
                        value={c.role}
                        onChange={(e) => handleRoleChange(c.user_id, e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value="client">Client</option>
                        <option value="office_admin">Office Admin</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {formatCurrency(c.yearIncome)}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {formatCurrency(c.yearExpenses)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        c.yearProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(c.yearProfit)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectClient(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Open Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Super Admin Section: Provision & Manage Licensed Tax Offices */}
      {isSuperAdmin && (
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">
                Super Admin — Licensed Tax Offices (White-Label Tenants)
              </h3>
              <p className="text-xs text-slate-400">
                Create a new white-label tax office tenant in 10 seconds and share their branded URL.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              required
              value={newOrg.slug}
              onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
              placeholder="URL slug (e.g., apex-tax)"
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
            />
            <input
              type="text"
              required
              value={newOrg.brand_name}
              onChange={(e) => setNewOrg({ ...newOrg, brand_name: e.target.value })}
              placeholder="Tax Office Brand Name"
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
            />
            <input
              type="email"
              value={newOrg.support_email}
              onChange={(e) => setNewOrg({ ...newOrg, support_email: e.target.value })}
              placeholder="Office Contact Email"
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
            />
            <input
              type="text"
              value={newOrg.logo_url}
              onChange={(e) => setNewOrg({ ...newOrg, logo_url: e.target.value })}
              placeholder="Logo URL (optional)"
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
            />
            <button
              type="submit"
              disabled={creatingOrg}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {creatingOrg ? 'Creating...' : 'Add Tax Office'}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase">
                  <th className="py-2 text-left">Brand Name</th>
                  <th className="py-2 text-left">Slug</th>
                  <th className="py-2 text-left">Branded URL</th>
                  <th className="py-2 text-left">Support Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allOrgs.map((org) => {
                  const url =
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/?office=${org.slug}`
                      : `/?office=${org.slug}`;
                  return (
                    <tr key={org.id}>
                      <td className="py-2.5 font-semibold text-white">{org.brand_name}</td>
                      <td className="py-2.5 font-mono text-emerald-400">{org.slug}</td>
                      <td className="py-2.5">
                        <a
                          href={url}
                          className="text-sky-400 hover:underline font-mono"
                        >
                          {url}
                        </a>
                      </td>
                      <td className="py-2.5 text-slate-300">{org.support_email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
